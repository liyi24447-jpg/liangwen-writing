import { scopedStorage } from '@lark-apaas/client-toolkit-lite';

// 会话与存储 key 计算 —— 独立模块避免循环依赖
// 所有按账号隔离的存储 key 统一在这里计算

const AUTH_SESSION_KEY = 'liangwen_auth_session';

export interface AuthSession {
  account: string;
  loginAt: number;
}

export function getCurrentSession(): AuthSession | null {
  try {
    const raw = scopedStorage.getItem(AUTH_SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AuthSession;
  } catch {
    return null;
  }
}

export function getCurrentAccount(): string | null {
  return getCurrentSession()?.account ?? null;
}

export function setSession(session: AuthSession): void {
  scopedStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(session));
}

export function clearSession(): void {
  scopedStorage.removeItem(AUTH_SESSION_KEY);
}

// 按账号隔离的存储 key
const BOOKS_STORAGE_PREFIX = 'liangwen_books';
const CURRENT_BOOK_PREFIX = 'liangwen_current_book';

export function getBooksStorageKey(): string {
  const account = getCurrentAccount();
  return account ? `${BOOKS_STORAGE_PREFIX}_${account}` : BOOKS_STORAGE_PREFIX;
}

export function getCurrentBookKey(): string {
  const account = getCurrentAccount();
  return account ? `${CURRENT_BOOK_PREFIX}_${account}` : CURRENT_BOOK_PREFIX;
}
