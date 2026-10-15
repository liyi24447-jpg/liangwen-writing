import { scopedStorage, logger } from '@lark-apaas/client-toolkit-lite';
import type { IBookWork } from '@/data/novel';

// ============================================================
// 会话令牌存储
// 真正的数据源是云端数据库；localStorage 只保存登录令牌（临时状态）。
// ============================================================

const ACCESS_TOKEN_KEY = 'liangwen_auth_token';
const REFRESH_TOKEN_KEY = 'liangwen_refresh_token';

export function getAuthToken(): string | null {
  return scopedStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getRefreshToken(): string | null {
  return scopedStorage.getItem(REFRESH_TOKEN_KEY);
}

export function setAuthTokens(accessToken: string, refreshToken?: string): void {
  scopedStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  if (refreshToken) {
    scopedStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  }
}

export function clearAuthTokens(): void {
  scopedStorage.removeItem(ACCESS_TOKEN_KEY);
  scopedStorage.removeItem(REFRESH_TOKEN_KEY);
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  /** HTTP 状态码（网络错误时为 0） */
  statusCode?: number;
}

// ============================================================
// 统一请求封装：始终请求真实后端 /api；401 时自动刷新令牌重试一次
// ============================================================

let refreshPromise: Promise<boolean> | null = null;

async function refreshSession(): Promise<boolean> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return false;

  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        const res = await fetch('/api/auth/refresh', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        });
        if (!res.ok) return false;
        const data = (await res.json()) as ApiResponse<{ accessToken: string; refreshToken: string }>;
        if (data.success && data.data) {
          setAuthTokens(data.data.accessToken, data.data.refreshToken);
          return true;
        }
        return false;
      } catch {
        return false;
      } finally {
        setTimeout(() => {
          refreshPromise = null;
        }, 0);
      }
    })();
  }
  return refreshPromise;
}

function redirectToLogin(): void {
  if (!window.location.pathname.startsWith('/login')) {
    window.location.href = '/login';
  }
}

export async function apiRequest<T = unknown>(
  path: string,
  options: RequestInit = {},
  allowRefresh = true
): Promise<ApiResponse<T>> {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  try {
    const res = await fetch(`/api${path}`, { ...options, headers });

    // 登录已过期：尝试用刷新令牌续期后重试一次
    if (res.status === 401 && allowRefresh && getRefreshToken()) {
      const refreshed = await refreshSession();
      if (refreshed) {
        return apiRequest<T>(path, options, false);
      }
    }

    if (res.status === 401) {
      clearAuthTokens();
      if (!path.startsWith('/auth/login') && !path.startsWith('/auth/register')) {
        redirectToLogin();
      }
      return {
        success: false,
        statusCode: 401,
        message: '未登录或登录已过期，请重新登录',
      };
    }

    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      return {
        success: false,
        statusCode: res.status,
        message: `服务器返回异常 (${res.status})，请稍后重试`,
      };
    }

    const data = (await res.json()) as ApiResponse<T>;
    if (!res.ok) {
      return {
        success: false,
        statusCode: res.status,
        message: data.message || `请求失败 (${res.status})`,
      };
    }
    return { ...data, statusCode: res.status };
  } catch (error) {
    logger.error(`[api] ${path} 网络错误: ${String(error)}`);
    return {
      success: false,
      statusCode: 0,
      message: '无法连接服务器，请检查网络后重试',
    };
  }
}

// ========== 认证 API ==========
export type MembershipLevel = 'none' | 'plus' | 'ultra';

export interface UserInfo {
  id: number;
  account: string;
  isAdmin: boolean;
  membershipLevel: MembershipLevel;
  membershipExpireAt: number;
}

export interface UserPermissions {
  canWriteShort: boolean;
  canDisassemble: boolean;
  canHotRank: boolean;
  canOptimize: boolean;
  canWorkbench: boolean;
  canUploadContinue: boolean;
}

export interface Announcement {
  id: number;
  title: string;
  content: string;
  isEnabled: boolean;
  updatedAt: number;
}

export interface RedemptionCode {
  id: number;
  code: string;
  membershipLevel: MembershipLevel;
  days: number;
  isActive: boolean;
  isUsed: boolean;
  usedBy?: number;
  usedAt?: number;
  createdAt: number;
  updatedAt: number;
}

export interface PasswordResetCode {
  id: number;
  code: string;
  isActive: boolean;
  isUsed: boolean;
  usedBy?: number;
  usedAccount?: string;
  usedAt?: number;
  createdAt: number;
}

export interface LoginResult {
  accessToken: string;
  refreshToken?: string;
  user: UserInfo;
}

export async function apiLogin(account: string, password: string): Promise<ApiResponse<LoginResult>> {
  return apiRequest<LoginResult>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ account, password }),
  });
}

export async function apiRegister(account: string, password: string): Promise<ApiResponse<LoginResult>> {
  return apiRequest<LoginResult>('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ account, password }),
  });
}

export async function apiLogout(): Promise<void> {
  const accessToken = getAuthToken();
  try {
    await fetch('/api/auth/logout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accessToken }),
    });
  } catch {
    /* 尽力而为 */
  }
  clearAuthTokens();
}

export async function apiMe(): Promise<ApiResponse<{ user: UserInfo; permissions: UserPermissions }>> {
  return apiRequest<{ user: UserInfo; permissions: UserPermissions }>('/auth/me', {
    method: 'GET',
  });
}

export async function apiChangePassword(cdk: string, newPassword: string): Promise<ApiResponse> {
  return apiRequest('/auth/change-password', {
    method: 'POST',
    body: JSON.stringify({ cdk, newPassword }),
  });
}

// ========== 管理后台 API ==========

export interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  adminUsers: number;
  totalBooks: number;
}

export interface AdminUserItem {
  id: number;
  account: string;
  isAdmin: boolean;
  isActive: boolean;
  createdAt: number;
  updatedAt: number;
  membershipLevel: MembershipLevel;
  membershipExpireAt: number;
  permissions: UserPermissions;
}

export async function apiAdminStats(): Promise<ApiResponse<AdminStats>> {
  return apiRequest<AdminStats>('/admin/stats', { method: 'GET' });
}

export async function apiAdminUserList(keyword?: string): Promise<ApiResponse<AdminUserItem[]>> {
  const qs = keyword ? `?keyword=${encodeURIComponent(keyword)}` : '';
  return apiRequest<AdminUserItem[]>(`/admin/users${qs}`, { method: 'GET' });
}

export async function apiAdminUserDisable(userId: number, disabled: boolean): Promise<ApiResponse> {
  return apiRequest(`/admin/users/${userId}/toggle-status`, {
    method: 'POST',
    body: JSON.stringify({ disabled }),
  });
}

export async function apiAdminUserResetPassword(userId: number, newPassword: string): Promise<ApiResponse> {
  return apiRequest(`/admin/users/${userId}/reset-password`, {
    method: 'PATCH',
    body: JSON.stringify({ newPassword }),
  });
}

export async function apiAdminUserDelete(userId: number): Promise<ApiResponse> {
  return apiRequest(`/admin/users/${userId}`, { method: 'DELETE' });
}

export async function apiAdminGetUserPermissions(userId: number): Promise<ApiResponse<UserPermissions>> {
  return apiRequest<UserPermissions>(`/admin/users/${userId}/permissions`, { method: 'GET' });
}

export async function apiAdminUpdateUserPermissions(
  userId: number,
  permissions: UserPermissions
): Promise<ApiResponse> {
  return apiRequest(`/admin/users/${userId}/permissions`, {
    method: 'PATCH',
    body: JSON.stringify({ permissions }),
  });
}

export interface LevelPermissionsMap {
  none: UserPermissions;
  plus: UserPermissions;
  ultra: UserPermissions;
}

export async function apiAdminGetLevelPermissions(): Promise<ApiResponse<LevelPermissionsMap>> {
  return apiRequest<LevelPermissionsMap>('/admin/permissions/levels', { method: 'GET' });
}

export async function apiAdminUpdateLevelPermission(
  level: 'none' | 'plus' | 'ultra',
  permissions: UserPermissions
): Promise<ApiResponse> {
  return apiRequest(`/admin/permissions/levels/${level}`, {
    method: 'PATCH',
    body: JSON.stringify({ permissions }),
  });
}

export async function apiAdminSetUserMembership(
  userId: number,
  level: MembershipLevel,
  days = 30
): Promise<ApiResponse<{ membershipLevel: MembershipLevel; membershipExpireAt: number }>> {
  return apiRequest(`/admin/users/${userId}/membership`, {
    method: 'POST',
    body: JSON.stringify({ level, days }),
  });
}

export async function apiAdminExtendMembership(
  userId: number,
  days: number
): Promise<ApiResponse<{ membershipLevel: MembershipLevel; membershipExpireAt: number }>> {
  return apiRequest(`/admin/users/${userId}/membership/extend`, {
    method: 'POST',
    body: JSON.stringify({ days }),
  });
}

export async function apiAdminGetAnnouncement(): Promise<ApiResponse<Announcement | null>> {
  return apiRequest<Announcement | null>('/admin/announcement', { method: 'GET' });
}

export async function apiAdminSaveAnnouncement(data: {
  title: string;
  content: string;
  isEnabled: boolean;
}): Promise<ApiResponse> {
  return apiRequest('/admin/announcement', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function apiAdminRedemptionCodeList(params?: {
  keyword?: string;
  status?: string;
}): Promise<ApiResponse<RedemptionCode[]>> {
  const qs = params ? `?${new URLSearchParams(params as Record<string, string>).toString()}` : '';
  return apiRequest<RedemptionCode[]>(`/admin/redemption-codes${qs}`, { method: 'GET' });
}

export async function apiAdminGenerateRedemptionCodes(data: {
  level: MembershipLevel;
  days: number;
  count?: number;
  prefix?: string;
}): Promise<ApiResponse<string[]>> {
  return apiRequest<string[]>('/admin/redemption-codes', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function apiAdminToggleRedemptionCode(codeId: number): Promise<ApiResponse<{ isActive: boolean }>> {
  return apiRequest<{ isActive: boolean }>(`/admin/redemption-codes/${codeId}/toggle`, {
    method: 'POST',
  });
}

export async function apiAdminDeleteRedemptionCode(codeId: number): Promise<ApiResponse> {
  return apiRequest(`/admin/redemption-codes/${codeId}`, { method: 'DELETE' });
}

// ========== 改密 CDK 管理 API ==========

export async function apiAdminPasswordResetCodeList(params?: {
  keyword?: string;
  status?: string;
}): Promise<ApiResponse<PasswordResetCode[]>> {
  const qs = params ? `?${new URLSearchParams(params as Record<string, string>).toString()}` : '';
  return apiRequest<PasswordResetCode[]>(`/admin/password-reset-codes${qs}`, { method: 'GET' });
}

export async function apiAdminGeneratePasswordResetCodes(data: {
  count?: number;
  prefix?: string;
}): Promise<ApiResponse<string[]>> {
  return apiRequest<string[]>('/admin/password-reset-codes', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function apiAdminTogglePasswordResetCode(
  codeId: number
): Promise<ApiResponse<{ isActive: boolean }>> {
  return apiRequest<{ isActive: boolean }>(`/admin/password-reset-codes/${codeId}/toggle`, {
    method: 'POST',
  });
}

export async function apiAdminDeletePasswordResetCode(codeId: number): Promise<ApiResponse> {
  return apiRequest(`/admin/password-reset-codes/${codeId}`, { method: 'DELETE' });
}

// ========== 公告 API ==========

export async function apiGetCurrentAnnouncement(): Promise<ApiResponse<Announcement | null>> {
  return apiRequest<Announcement | null>('/announcement/current', { method: 'GET' });
}

// ========== 兑换码 API ==========

export async function apiRedeemCode(
  code: string
): Promise<ApiResponse<{ membershipLevel: MembershipLevel; membershipExpireAt: number }>> {
  return apiRequest<{ membershipLevel: MembershipLevel; membershipExpireAt: number }>('/redemption/redeem', {
    method: 'POST',
    body: JSON.stringify({ code }),
  });
}

// ========== 作品 API（契约与后端一致：data 直接是作品对象/数组） ==========

export async function apiGetAllBooks(): Promise<ApiResponse<IBookWork[]>> {
  return apiRequest<IBookWork[]>('/books', { method: 'GET' });
}

export async function apiGetBook(bookId: string): Promise<ApiResponse<IBookWork>> {
  return apiRequest<IBookWork>(`/books/${bookId}`, { method: 'GET' });
}

export async function apiCreateBook(book: IBookWork): Promise<ApiResponse<IBookWork>> {
  return apiRequest<IBookWork>('/books', {
    method: 'POST',
    body: JSON.stringify(book),
  });
}

export async function apiSaveBook(book: IBookWork): Promise<ApiResponse<IBookWork>> {
  return apiRequest<IBookWork>(`/books/${book.id}`, {
    method: 'PUT',
    body: JSON.stringify(book),
  });
}

export async function apiDeleteBook(bookId: string): Promise<ApiResponse> {
  return apiRequest(`/books/${bookId}`, { method: 'DELETE' });
}

// ========== 每日字数配额 API（云端统一统计，跨设备一致） ==========

export interface QuotaResult {
  ok: boolean;
  used: number;
  /** 0 表示不限制 */
  limit: number;
  message: string;
}

export async function apiConsumeQuota(chars: number): Promise<ApiResponse<QuotaResult>> {
  return apiRequest<QuotaResult>('/quota/consume', {
    method: 'POST',
    body: JSON.stringify({ chars }),
  });
}

// ========== 数据导出/导入 API（跨设备迁移） ==========

export interface ExportResult {
  version: 1;
  exportAt: number;
  account: string;
  user: {
    id: number;
    account: string;
    isAdmin: boolean;
    status: string;
    membershipLevel: MembershipLevel;
    membershipExpireAt: number;
    createdAt: number;
    updatedAt: number;
  };
  permissions: UserPermissions;
  books: IBookWork[];
}

export async function apiExportUserData(): Promise<ApiResponse<ExportResult>> {
  return apiRequest<ExportResult>('/data/export', { method: 'GET' });
}

export async function apiImportUserData(
  data: ExportResult
): Promise<ApiResponse<{ importedBooks: number; skippedBooks: number }>> {
  return apiRequest('/data/import', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

