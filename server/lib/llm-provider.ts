/**
 * 通用 LLM 文本生成（OpenAI 兼容协议）
 *
 * 当配置了 LLM_API_KEY 时，AI 能力代理不再依赖妙搭应用的免费额度，
 * 而是直接调用任意 OpenAI 兼容的 Chat Completions 服务（DeepSeek / Moonshot /
 * 智谱 / OpenAI 等），并把结果包装成前端 capabilityClient 期望的 SSE 帧。
 *
 * 环境变量：
 *  - LLM_API_KEY  ：服务商 API Key（配置后启用，留空则回退到妙搭代理）
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

/** 已知参数键到中文标签的映射，便于 LLM 理解 */
const PARAM_LABELS: Record<string, string> = {
  genre: '题材',
  novel_type: '任务类型',
  setting: '核心设定',
  characters: '人物',
  style: '文风要求',
  additional_requirements: '具体要求',
  content: '原文内容',
  text: '原文内容',
  title: '书名',
  word_count: '字数要求',
  chapter_count: '章节数',
};

/** 把能力请求的 params 组装成 system / user 文本 */
export function buildChatMessages(body: any): { system: string; user: string } {
  const params = (body && body.params) || {};

  const system =
    '你是「靓文写作」内置的资深网络小说创作助手，拥有多年网文创作与金牌编辑经验，' +
    '精通男频、女频各类题材（玄幻、仙侠、都市、悬疑、言情、历史、科幻等），' +
    '擅长围绕指定任务产出结构清晰、文笔流畅、贴合网文阅读节奏的内容。' +
    '请严格按用户的任务要求输出成品，直接给出结果，不要寒暄、不要解释你是如何完成的。' +
    '当要求特定字数时，请尽量达到；当要求输出列表或结构化内容时，请保持格式整齐。';

  const sections: string[] = [];
  Object.keys(params).forEach((key) => {
    const raw = params[key];
    if (raw === null || raw === undefined || raw === '') return;
    const value = typeof raw === 'string' ? raw : JSON.stringify(raw);
    if (value === '无' || value.trim() === '') return;
    const label = PARAM_LABELS[key] || key;
    sections.push(`【${label}】\n${value}`);
  });

  return { system, user: sections.join('\n\n') };
}

/** 前端 capabilityClient 期望的 SSE 帧 */
function contentFrame(content: string, finished: boolean): string {
  return `data: ${JSON.stringify({
    status_code: '0',
    data: { type: 'content', delta: { content }, finished },
  })}\n`;
}

/**
 * 通过通用 LLM 流式生成文本，并直接写入响应。
 * 仅在 getLLMConfig() 非空时调用。
 */
export async function streamTextViaLLM(body: any, req: any, res: any): Promise<void> {
  const cfg = getLLMConfig();
  if (!cfg) {
    res.status(503).json({ success: false, message: '未配置 LLM 服务' });
    return;
  }

  const { system, user } = buildChatMessages(body);

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
  } catch (err: any) {
    res.write(
      `data: ${JSON.stringify({
        status_code: '0',
        data: { type: 'error', error: { code: 'llm_fetch_failed', message: `无法连接 LLM 服务：${err?.message || err}` } },
      })}\n`
    );
    res.end();
    return;
  }

  if (!upstream.ok || !upstream.body) {
    const errText = await upstream.text().catch(() => '');
    res.write(
      `data: ${JSON.stringify({
        status_code: '0',
        data: {
          type: 'error',
          error: {
            code: `llm_http_${upstream.status}`,
            message: `LLM 服务返回错误（HTTP ${upstream.status}）：${errText.slice(0, 300)}`,
          },
        },
      })}\n`
    );
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
          const json = JSON.parse(data);
          const delta: string = json.choices?.[0]?.delta?.content ?? '';
          if (delta) {
            res.write(contentFrame(delta, false));
          }
        } catch {
          // 忽略非内容片段（usage 等）
        }
      }
    }
  } catch (err: any) {
    res.write(
      `data: ${JSON.stringify({
        status_code: '0',
        data: { type: 'error', error: { code: 'llm_stream_error', message: err?.message || String(err) } },
      })}\n`
    );
    res.end();
    return;
  }

  if (!aborted) {
    res.write(contentFrame('', true));
    res.end();
  }
}
