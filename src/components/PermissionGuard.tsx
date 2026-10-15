import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth-context';
import type { ReactNode } from 'react';
import type { PermissionKey } from '@/lib/permissions';
import { AlertTriangle, Crown, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PERMISSION_LABELS } from '@/lib/permissions';

interface PermissionGuardProps {
  children: ReactNode;
  permission?: PermissionKey;
  requireLogin?: boolean;
}

/**
 * 权限守卫组件：
 * - 未登录 + requireLogin=true → 跳转登录页
 * - 已登录但缺少对应权限 → 展示"功能未开放"提示，引导开通会员/联系管理员
 * - 管理员直接放行
 */
export default function PermissionGuard({
  children,
  permission,
  requireLogin = true,
}: PermissionGuardProps) {
  const { isLoggedIn, isLoading, permissions, isAdmin, isMember, isPlus, isUltra } = useAuth();
  const navigate = useNavigate();

  // 始终调用 hook，不传 permission 时默认允许
  const hasPermission = !permission
    ? true
    : isAdmin
      ? true
      : !isLoggedIn
        ? true
        : !permissions
          ? true
          : permissions[permission];

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-muted-foreground">加载中...</div>
      </div>
    );
  }

  if (requireLogin && !isLoggedIn) {
    return <Navigate to="/login" replace />;
  }

  if (permission && !hasPermission) {
    const featureName = permission ? PERMISSION_LABELS[permission] : '该功能';
    return (
      <div className="min-h-[70vh] flex items-center justify-center bg-background">
        <div className="text-center max-w-md mx-auto px-6">
          <div className="size-20 mx-auto mb-6 rounded-full bg-warning/10 flex items-center justify-center">
            <AlertTriangle className="size-10 text-warning" />
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-3">暂无使用权限</h2>
          <p className="text-muted-foreground mb-6">
            你的账号尚未开通「{featureName}」功能。
            {!isMember && (
              <span className="block mt-2 text-sm">
                升级会员可解锁更多功能，或联系管理员开通权限。
              </span>
            )}
            {isMember && isPlus && (
              <span className="block mt-2 text-sm">
                该功能仅 Ultra 会员可使用，升级 Ultra 即可解锁全部创作能力。
              </span>
            )}
            {isMember && isUltra && (
              <span className="block mt-2 text-sm">
                如已开通会员仍无法使用，请联系管理员检查权限配置。
              </span>
            )}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            {!isMember && (
              <Button
                className="bg-gradient-to-r from-primary to-amber-500 text-primary-foreground hover:from-primary/90 hover:to-amber-500/90"
                onClick={() => navigate('/redemption')}
              >
                <Crown className="size-4 mr-2" />
                开通会员
                <ArrowRight className="size-4 ml-2" />
              </Button>
            )}
            {isMember && isPlus && (
              <Button
                className="bg-gradient-to-r from-purple-500 to-fuchsia-500 text-white hover:from-purple-600 hover:to-fuchsia-600"
                onClick={() => navigate('/redemption')}
              >
                <Crown className="size-4 mr-2" />
                升级 Ultra
                <ArrowRight className="size-4 ml-2" />
              </Button>
            )}
            <Button variant="outline" onClick={() => navigate('/')}>
              返回首页
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
