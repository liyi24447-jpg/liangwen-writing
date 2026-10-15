import { useAuth } from '@/lib/auth-context';
import type { MembershipLevel } from '@/lib/api-client';

/**
 * 权限点位枚举，对应后端 user_permissions 表的字段
 */
export type PermissionKey =
  | 'canWriteShort'      // 短篇创作
  | 'canDisassemble'     // 拆书分析
  | 'canHotRank'         // 网文扫榜
  | 'canOptimize'        // 去AI味
  | 'canWorkbench'       // 书案工作台
  | 'canUploadContinue'; // 上传续写

export const PERMISSION_LABELS: Record<PermissionKey, string> = {
  canWriteShort: '短篇创作',
  canDisassemble: '拆书分析',
  canHotRank: '网文扫榜',
  canOptimize: '去AI味',
  canWorkbench: '书案工作台',
  canUploadContinue: '上传续写',
};

/**
 * 路由/功能级权限判断（用于 PermissionGuard 和功能按钮）
 * - 管理员始终返回 true
 * - 未登录游客返回 true（兼容现状：游客跳登录守卫）
 * - 普通用户按 permissions 字段判断
 */
export function useHasPermission(key: PermissionKey): boolean {
  const { isAdmin, permissions, isLoggedIn } = useAuth();

  // 管理员不受限
  if (isAdmin) return true;
  // 未登录：按"允许访问但会被登录守卫拦截"处理，返回 true
  if (!isLoggedIn) return true;
  // 无权限数据时默认允许（兜底）
  if (!permissions) return true;
  return permissions[key];
}

/**
 * 会员等级判断
 */
export function useMembership(): {
  level: MembershipLevel;
  expireAt: number;
  isPlus: boolean;
  isUltra: boolean;
  isMember: boolean;
} {
  const { user } = useAuth();
  const level = user?.membershipLevel || 'none';
  const expireAt = user?.membershipExpireAt || 0;
  return {
    level,
    expireAt,
    isPlus: level === 'plus',
    isUltra: level === 'ultra',
    isMember: level === 'plus' || level === 'ultra',
  };
}
