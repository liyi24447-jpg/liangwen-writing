import { useEffect, useState } from 'react';

const SITE_NAME = '靓文写作';

// 路由到页面标题的映射（精确匹配）
const PAGE_TITLES: Record<string, string> = {
  '/': 'AI 智能创作平台',
  '/write': '短篇创作',
  '/disassemble': '拆书分析',
  '/hot-rank': '网文扫榜',
  '/optimize': '去 AI 味优化',
  '/library': '藏书阁',
  '/login': '登录',
  '/register': '注册',
};

// 路由前缀匹配（以该路径开头的所有子路径用同一个标题）
const PREFIX_TITLES: Array<[string, string]> = [
  ['/workbench/', '书案工作台'],
];

/**
 * 统一管理 document.title
 * 使用原生 popstate + hashchange 监听，不依赖 Router context，
 * 确保在任何路由层级下都能正常工作
 */
export default function DocumentTitle() {
  const [path, setPath] = useState<string>(() => window.location.pathname);

  useEffect(() => {
    // 立即设置一次（首屏即生效，不被容器默认标题覆盖）
    const setTitle = (p: string) => {
      let subtitle = '';

      // 精确匹配
      if (PAGE_TITLES[p]) {
        subtitle = PAGE_TITLES[p];
      } else {
        // 前缀匹配
        for (const [prefix, title] of PREFIX_TITLES) {
          if (p.startsWith(prefix)) {
            subtitle = title;
            break;
          }
        }
      }

      if (subtitle) {
        document.title = `${subtitle} · ${SITE_NAME}`;
      } else {
        document.title = `${SITE_NAME} · AI 智能创作平台`;
      }
    };

    setTitle(window.location.pathname);

    // 监听路由变化
    const handlePopState = () => {
      setPath(window.location.pathname);
      setTitle(window.location.pathname);
    };

    const handleHashChange = () => {
      setPath(window.location.pathname);
      setTitle(window.location.pathname);
    };

    window.addEventListener('popstate', handlePopState);
    window.addEventListener('hashchange', handleHashChange);

    // 拦截 history.pushState / replaceState（react-router 的 BrowserRouter 走的是 history API）
    const originalPush = history.pushState;
    const originalReplace = history.replaceState;

    history.pushState = function (...args: Parameters<typeof originalPush>) {
      const result = originalPush.apply(this, args);
      // 延迟一帧确保 pathname 已更新
      requestAnimationFrame(() => {
        setPath(window.location.pathname);
        setTitle(window.location.pathname);
      });
      return result;
    };

    history.replaceState = function (...args: Parameters<typeof originalReplace>) {
      const result = originalReplace.apply(this, args);
      requestAnimationFrame(() => {
        setPath(window.location.pathname);
        setTitle(window.location.pathname);
      });
      return result;
    };

    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('hashchange', handleHashChange);
      history.pushState = originalPush;
      history.replaceState = originalReplace;
    };
  }, []);

  // path 只用于调试，不参与渲染
  void path;

  return null;
}
