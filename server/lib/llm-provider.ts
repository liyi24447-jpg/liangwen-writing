/**
 * 通用 LLM 文本生成（OpenAI 兼容协议）
 *
 * 独立部署后，前端 capabilityClient 把请求发到 /api/capability/:id/stream，
 * 由 capability 路由转发到这里。这里复用 shared/capabilities/*.json 里的
 * 提示词模板，保证每个能力的输出结构（书名 10 个、梗概要素、正文要求等）
 * 与平台一致，而不是简单地把 params 拼成 KV。
 *
 * 环境变量：
 *  - LLM_API_KEY  ：服务商 API Key（配置后启用）
 *  - LLM_BASE_URL ：服务地址，需含 /v1，默认 https://api.deepseek.com/v1
 *  - LLM_MODEL    ：模型名，默认 deepseek-chat
 */

export interface LLMConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
}

export function getLLMConfig(): LLMConfig | null {
  const apiKey = (process.env.LLM_API_KEY || '').trim();
  if (!apiKey) return null;
  const baseUrl = (process.env.LLM_BASE_URL || 'https://api.deepseek.com/v1').replace(/\/+$/, '');
  const model = (process.env.LLM_MODEL || 'deepseek-chat').trim();
  return { baseUrl, apiKey, model };
}

const SYSTEM_PROMPT =
  '你是「靓文写作」内置的资深网络小说创作助手，拥有多年网文创作与金牌编辑经验，' +
  '精通男频、女频各类题材，擅长围绕指定任务输出结构清晰、文笔流畅、贴合网文阅读节奏的成品。' +
  '请严格按用户的任务要求输出成品，直接给出结果，不要寒暄、不要解释你的过程。' +
  '当要求特定字数时尽量达到；当要求输出列表或结构化内容时保持格式整齐。';

// 与 shared/capabilities/*.json 中 formValue.prompt 保持一致的提示词模板
const TEMPLATES: Record<string, string> = {
  ai_novel_generate_1: `你是一位资深的专业小说作家，拥有丰富的创作经验和出色的文字驾驭能力，擅长各种题材和风格的小说创作。

请根据以下信息创作小说正文内容：

1. 小说题材：{{input.genre}}
2. 小说类型：{{input.novel_type}}
3. 世界观设定：{{input.setting}}
4. 主要人物：{{input.characters}}
5. 写作风格：{{input.style}}
6. 补充要求：{{input.additional_requirements}}

创作要求：
1. 内容生动有趣，情节紧凑，符合给定的题材和设定
2. 人物塑造鲜明，符合人物设定的性格特点
3. 语言流畅自然，符合指定的写作风格
4. 情节发展合理，富有吸引力，能够引起读者的阅读兴趣
5. 避免出现逻辑漏洞和不合理的情节
6. 开头要有足够的吸引力，能够迅速抓住读者注意力

请直接输出小说正文内容，无需其他说明。`,

  ai_book_title_suggestion_1: `你是一位资深的网文编辑，拥有丰富的书名创作经验，擅长打造吸引读者点击的爆款书名。

请根据以下小说信息生成10个有吸引力的书名建议：
- 小说题材：{{input.novel_theme}}
- 小说风格：{{input.novel_style}}
- 核心设定：{{input.novel_setting}}

书名要求：
1. 长度控制在4-12字之间，简洁易记
2. 突出核心卖点，符合对应题材的读者喜好
3. 包含记忆点或悬念感，能激发读者好奇心
4. 避免生僻字和过于复杂的表述
5. 风格匹配用户输入的小说风格

输出格式：
直接列出10个书名，每个书名单独一行，前面标注序号，不需要额外解释说明`,

  ai_text_humanize_optimization_1: `你是一位专业的文本润色专家，擅长将AI生成的文本改造为更自然、更具人类写作质感的内容，有效减少AI痕迹。

请对以下AI生成的文本进行优化润色：
待优化文本：{{input.ai_generated_text}}

优化原则：
1. 自然化处理：调整过于规整刻板的句式，加入自然的衔接词和口语化表达，保留核心含义
2. 风格调整：保持原文整体风格，让文本更有温度和个人特色
3. 逻辑优化：梳理逻辑层次，修正不顺畅或重复的问题

额外优化要求：{{input.custom_requirements}}

输出要求：
- 直接输出优化后的完整文本，不需要额外解释
- 长度与原文基本相当`,

  book_analysis_disassemble_1: `你是一位资深的文学分析专家和写作导师，具备深厚的文本解读能力和丰富的创作指导经验。

请对以下文章内容进行专业的拆书分析，拆解成可学习的要点：
文章内容：{{input.article_content}}

分析结构要求：
1. 书名（如原文未明确给出书名，请根据内容提炼合适的名称并标注"【推测】"）
2. 内容简介：用150-200字概括文章核心内容、主要观点或故事情节
3. 开篇分析：分析文章开头的写作手法、吸引力设计、信息传递效率
4. 文风分析：总结语言风格、叙事节奏、情感基调，列举3个以上典型特征并结合原文例子说明
5. 创作提示：提炼3-5个写作者可直接借鉴的写作技巧，每条包含具体方法和适用场景

输出要求：
- 结构清晰，每个部分使用明确的标题区分
- 分析客观专业，语言通俗易懂
- 所有分析必须基于提供的文章内容，不做无依据的臆断`,
};

function fillTemplate(template: string, params: Record<string, unknown>): string {
  return template.replace(/\{\{input\.([a-zA-Z0-9_]+)\}\}/g, (_m, key: string) => {
    const value = params[key];
    if (value === undefined || value === null) return '';
    return String(value);
  });
}

/** 把能力请求的 params 组装成 system / user 文本 */
export function buildChatMessages(
  capabilityId: string,
  body: Record<string, unknown>
): { system: string; user: string } {
  const params = ((body && body.params) || {}) as Record<string, unknown>;
  const template = TEMPLATES[capabilityId];

  // 上传续写场景：代码传入了完整 task 指令（含输出格式），优先使用它
  const task = typeof params.task === 'string' ? params.task : '';
  if (capabilityId === 'book_analysis_disassemble_1' && task.trim().length > 20) {
    return { system: SYSTEM_PROMPT, user: task };
  }

  // 进阶场景：additional_requirements 已包含完整指令，直接使用
  const addReq = typeof params.additional_requirements === 'string' ? params.additional_requirements : '';
  if (template && addReq.trim().length > 40) {
    return { system: SYSTEM_PROMPT, user: addReq };
  }

  if (template) {
    return { system: SYSTEM_PROMPT, user: fillTemplate(template, params) };
  }

  return { system: SYSTEM_PROMPT, user: JSON.stringify(params, null, 2) };
}

/** 前端 capabilityClient 期望的 SSE 帧 */
function contentFrame(content: string, finished: boolean): string {
  return `data: ${JSON.stringify({
    status_code: '0',
    data: { type: 'content', delta: { content }, finished },
  })}\n`;
}

function errorFrame(code: string, message: string): string {
  return `data: ${JSON.stringify({
    status_code: '0',
    data: { type: 'error', error: { code, message } },
  })}\n`;
}

/**
 * 通过通用 LLM 流式生成文本，并直接写入响应。
 * 仅在 getLLMConfig() 非空时调用。
 */
export async function streamTextViaLLM(
  capabilityId: string,
  body: Record<string, unknown>,
  req: { on: (ev: string, cb: () => void) => void },
  res: {
    status: (code: number) => { json: (payload: Record<string, unknown>) => void };
    setHeader: (name: string, value: string) => void;
    flushHeaders?: () => void;
    write: (chunk: string) => void;
    end: () => void;
  }
): Promise<void> {
  const cfg = getLLMConfig();
  if (!cfg) {
    res.status(503).json({ success: false, message: '未配置 LLM 服务' });
    return;
  }

  const { system, user } = buildChatMessages(capabilityId, body);

  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders?.();

  let upstream: Response;
  try {
    upstream = await fetch(`${cfg.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${cfg.apiKey}`,
      },
      body: JSON.stringify({
        model: cfg.model,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
        stream: true,
        temperature: 0.85,
        top_p: 0.95,
        frequency_penalty: 0.05,
      }),
    });
  } catch (err: unknown) {
    res.write(
      errorFrame('llm_fetch_failed', `无法连接 LLM 服务：${err instanceof Error ? err.message : String(err)}`)
    );
    res.end();
    return;
  }

  if (!upstream.ok || !upstream.body) {
    const errText = await upstream.text().catch(() => '');
    res.write(errorFrame(`llm_http_${upstream.status}`, `LLM 服务返回错误（HTTP ${upstream.status}）：${errText.slice(0, 300)}`));
    res.end();
    return;
  }

  const reader = upstream.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let aborted = false;
  req.on('close', () => {
    aborted = true;
    reader.cancel().catch(() => undefined);
  });

  try {
    while (!aborted) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data:')) continue;
        const data = trimmed.slice(5).trim();
        if (!data || data === '[DONE]') continue;
        try {
          const json = JSON.parse(data) as { choices?: Array<{ delta?: { content?: string } }> };
          const delta = json.choices?.[0]?.delta?.content ?? '';
          if (delta) {
            res.write(contentFrame(delta, false));
          }
        } catch {
          // 忽略非内容片段（usage 等）
        }
      }
    }
  } catch (err: unknown) {
    res.write(errorFrame('llm_stream_error', err instanceof Error ? err.message : String(err)));
    res.end();
    return;
  }

  if (!aborted) {
    res.write(contentFrame('', true));
    res.end();
  }
}

