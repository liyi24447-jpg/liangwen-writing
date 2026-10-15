import { getAuthToken } from './api-client';

/**
 * 给独立部署版的 AI 能力请求注入 Authorization 头。
 *
 * 妙搭平台的 capabilityClient 在平台内依赖会话 cookie 鉴权，不会携带
 * Authorization；独立部署后改为由我们的服务端代理，需要带上本站 JWT。
 * 这里在全局 fetch 上包一层：凡是请求 `/api/capability/` 的，自动补上
 * 当前登录用户的 Bearer Token。需在应用启动最早期（早于任何能力调用）执行。
 */
let installed = false;

export function installCapabilityAuth(): void {
  if (installed || typeof window === 'undefined' || !window.fetch) return;
  installed = true;

  const originalFetch = window.fetch.bind(window);

  window.fetch = (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    try {
      const url =
        typeof input === 'string'
          ? input
          : input instanceof URL
            ? input.toString()
            : input.url;

      if (url.includes('/api/capability/')) {
        const token = getAuthToken();
        if (token) {
          const headers = new Headers(init?.headers);
          if (!headers.has('Authorization')) {
            headers.set('Authorization', `Bearer ${token}`);
          }
          init = { ...init, headers };
        }
      }
    } catch {
      // 注入失败时不影响原始请求
    }
    return originalFetch(input, init);
  };
}
