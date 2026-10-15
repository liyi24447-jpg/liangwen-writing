import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { logger } from '@lark-apaas/client-toolkit-lite';
import {
  apiLogin,
  apiRegister,
  apiMe,
  apiLogout,
  setAuthTokens,
  clearAuthTokens,
  getAuthToken,
  type UserInfo,
  type UserPermissions,
  type MembershipLevel,
} from '@/lib/api-client';

interface AuthContextValue {
  user: UserInfo | null;
  permissions: UserPermissions | null;
  account: string | null;
  isLoggedIn: boolean;
  isAdmin: boolean;
  isLoading: boolean;
  membershipLevel: MembershipLevel;
  membershipExpireAt: number;
  isMember: boolean;
  isPlus: boolean;
  isUltra: boolean;
  login: (account: string, password: string) => Promise<{ success: boolean; message: string }>;
  register: (account: string, password: string) => Promise<{ success: boolean; message: string }>;
  logout: () => Promise<void>;
  refreshMe: () => Promise<void>;
  updateMembership: (level: MembershipLevel, expireAt: number) => void;
}

const ALL_PERMISSIONS_ON: UserPermissions = {
  canWriteShort: true,
  canDisassemble: true,
  canHotRank: true,
  canOptimize: true,
  canWorkbench: true,
  canUploadContinue: true,
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [permissions, setPermissions] = useState<UserPermissions | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 拉取当前用户信息
  const refreshMe = useCallback(async () => {
    const token = getAuthToken();
    if (!token) {
      setUser(null);
      setPermissions(null);
      setIsLoading(false);
      return;
    }
    const res = await apiMe();
    if (res.success && res.data) {
      setUser(res.data.user);
      if (res.data.user.isAdmin) {
        setPermissions(ALL_PERMISSIONS_ON);
      } else {
        setPermissions(res.data.permissions);
      }
      logger.info(
        '[auth] 当前用户:',
        res.data.user.account,
        '管理员:',
        res.data.user.isAdmin,
        '会员:',
        res.data.user.membershipLevel
      );
    } else if (res.statusCode === 401) {
      // 令牌确实失效（网络错误不会走到这里），才清空登录态
      clearAuthTokens();
      setUser(null);
      setPermissions(null);
    }
    setIsLoading(false);
  }, []);

  // 初始化：用本地令牌恢复登录状态（登录状态保持）
  useEffect(() => {
    refreshMe();
  }, [refreshMe]);

  const updateMembership = useCallback((level: MembershipLevel, expireAt: number) => {
    setUser((prev) => {
      if (!prev) return prev;
      return { ...prev, membershipLevel: level, membershipExpireAt: expireAt };
    });
  }, []);

  const login = useCallback(async (account: string, password: string) => {
    const result = await apiLogin(account, password);
    if (result.success && result.data) {
      setAuthTokens(result.data.accessToken, result.data.refreshToken);
      setUser(result.data.user);
      if (result.data.user.isAdmin) {
        setPermissions(ALL_PERMISSIONS_ON);
      } else {
        const meRes = await apiMe();
        if (meRes.success && meRes.data) {
          setPermissions(meRes.data.permissions);
          setUser(meRes.data.user);
        }
      }
    }
    return { success: result.success, message: result.message };
  }, []);

  const register = useCallback(async (account: string, password: string) => {
    const result = await apiRegister(account, password);
    if (result.success && result.data) {
      setAuthTokens(result.data.accessToken, result.data.refreshToken);
      setUser(result.data.user);
      const meRes = await apiMe();
      if (meRes.success && meRes.data) {
        setPermissions(meRes.data.permissions);
        setUser(meRes.data.user);
      }
    }
    return { success: result.success, message: result.message };
  }, []);

  const logout = useCallback(async () => {
    await apiLogout();
    setUser(null);
    setPermissions(null);
    logger.info('[auth] 已登出');
  }, []);

  const membershipLevel = user?.membershipLevel || 'none';
  const membershipExpireAt = user?.membershipExpireAt || 0;

  const value: AuthContextValue = {
    user,
    permissions,
    account: user?.account ?? null,
    isLoggedIn: !!user,
    isAdmin: user?.isAdmin ?? false,
    isLoading,
    membershipLevel,
    membershipExpireAt,
    isMember: membershipLevel === 'plus' || membershipLevel === 'ultra',
    isPlus: membershipLevel === 'plus',
    isUltra: membershipLevel === 'ultra',
    login,
    register,
    logout,
    refreshMe,
    updateMembership,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}

