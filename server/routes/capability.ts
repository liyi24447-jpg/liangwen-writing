import { Router } from 'express';
import { authRequired } from '../middleware/auth.js';
import { getLLMConfig, streamTextViaLLM } from '../lib/llm-provider.js';

const router = Router();

/**
 * 妙搭（Miaoda）AI 能力代理
 *
 * 独立部署后，前端的 capabilityClient 不再由妙搭平台直接服务，
 * 由本服务把 `/api/capability/:id/stream`（及非流式）转发到妙搭应用的
 * plugin_server capability 端点，再把结果原样回传给浏览器。
 *
 * 所需环境变量：
 *  - MIAODA_CSRF_TOKEN：妙搭登录态下的 X-Suda-Csrf-Token（必需）
 *  - MIAODA_ORIGIN：妙搭站点 origin（默认官方在线地址）
 *  - MIAODA_APP_REF：被代理的妙搭应用 ID（默认 app_17fz9k7kgja）
 */
const MIAODA_ORIGIN = (process.env.MIAODA_ORIGIN || 'https://4m8y7pbpa828n.doubaoapps.com').replace(/\/+$/, '');
const MIAODA_APP_REF = process.env.MIAODA_APP_REF || 'app_17fz9k7kgja';
const MIAODA_CSRF = process.env.MIAODA_CSRF_TOKEN || '';

/** 构造上游妙搭能力端点 */
function buildUpstreamUrl(capId: string, mode: 'stream' | 'execute'): string {
  const suffix = mode === 'stream' ? '/execute/stream' : '/execute';
  return `${MIAODA_ORIGIN}/app/${MIAODA_APP_REF}/__runtime__/api/v1/plugin_server/capability/${capId}${suffix}`;
}

/** 递归改写并返回新对象：把相对的妙搭资源路径（/spark/...）转为绝对 URL */
function rewritePaths(value: any, origin: string): any {
  if (Array.isArray(value)) {
    return value.map((v) => rewritePaths(v, origin));
  }
  if (value !== null && typeof value === 'object') {
    const out: Record<string, any> = {};
    Object.keys(value).forEach((k) => {
      out[k] = rewritePaths(value[k], origin);
    });
    return out;
  }
  if (typeof value === 'string' && value.startsWith('/spark/')) {
    return origin + value;
  }
  return value;
}

// 流式（/stream）与非流式（无尾段）
router.post('/capability/:capId/stream', authRequired, async (req, res, next) => {
  return handleCapability(req, res, next, 'stream');
});
router.post('/capability/:capId', authRequired, async (req, res, next) => {
  return handleCapability(req, res, next, 'execute');
});

async function handleCapability(
  req: any,
  res: any,
  next: any,
  mode: 'stream' | 'execute'
): Promise<void> {
  try {
    const capId = String(req.params.capId);

    // 流式文本生成：优先走通用 LLM（OpenAI 兼容），未配置时回退妙搭代理
    if (mode === 'stream' && getLLMConfig()) {
      await streamTextViaLLM(capId, req.body, req, res);
      return;
    }

    if (!MIAODA_CSRF) {
      res.status(503).json({
        success: false,
        message: '服务端未配置 AI 能力凭证（MIAODA_CSRF_TOKEN），请在后台环境变量中设置后重试',
      });
      return;
    }

    const upstreamUrl = buildUpstreamUrl(capId, mode);
    const rawBody = JSON.stringify(req.body ?? {});

    const upstream = await fetch(upstreamUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Suda-Csrf-Token': MIAODA_CSRF,
      },
      body: rawBody,
    });

    if (!upstream.ok || !upstream.body) {
      // 上游异常（常见为 CSRF 失效 401/403），把状态透出，便于排查
      const status = upstream.status;
      const text = await upstream.text().catch(() => '');
      console.error(`[capability] 上游返回 ${status}，capId=${capId}，body=${text.slice(0, 300)}`);
      res.status(status === 401 || status === 403 ? 503 : 502).json({
        success: false,
        message:
          status === 401 || status === 403
            ? 'AI 能力凭证已失效（401/403），请在后台更新 MIAODA_CSRF_TOKEN 后重试'
            : `AI 能力服务暂时不可用（HTTP ${status}）`,
      });
      return;
    }

    if (mode === 'stream') {
      // SSE：设置与上游一致的流式响应头，逐块转发
      res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
      res.setHeader('Cache-Control', 'no-cache, no-transform');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no');
      res.flushHeaders?.();

      const reader = upstream.body.getReader();
      let aborted = false;
      req.on('close', () => {
        aborted = true;
        reader.cancel().catch(() => undefined);
      });

      while (!aborted) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(Buffer.from(value));
      }
      res.end();
    } else {
      // 非流式（如封面文生图）：解析 JSON，把其中相对的妙搭资源路径
      // （/spark/...）改写为绝对 URL，避免独立站前端按本站 origin 加载导致裂图
      const text = await upstream.text();
      let payloadText = text;
      try {
        const parsed = JSON.parse(text);
        payloadText = JSON.stringify(rewritePaths(parsed, MIAODA_ORIGIN));
      } catch {
        // 非 JSON 则原样返回
      }
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.send(payloadText);
    }
  } catch (err) {
    next(err);
  }
}

export default router;
