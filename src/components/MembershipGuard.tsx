import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth-context';
import type { ReactNode } from 'react';
import { Crown, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface MembershipGuardProps {
  children: ReactNode;
  /** 最低会员等级：plus 或 ultra，默认 plus */
  minLevel?: 'plus' | 'ultra';
}

/**
 * 会员守卫组件：
 * - 管理员直接放行
 * - 普通用户需满足最低会员等级
 * - 未达标展示会员引导页
 */
export default function MembershipGuard({
  children,
  minLevel = 'plus',
}: MembershipGuardProps) {
  const { isAdmin, isLoading, isUltra, isPlus, isLoggedIn } = useAuth();
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-muted-foreground">加载中...</div>
      </div>
    );
  }

  // 管理员不受限
  if (isAdmin) return <>{children}</>;

  // 未登录：由外层登录守卫处理，这里直接放行
  if (!isLoggedIn) return <>{children}</>;

  // 等级判定
  const hasAccess = isUltra || (minLevel === 'plus' && isPlus);

  if (!hasAccess) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center bg-background">
        <div className="text-center max-w-md mx-auto px-6">
          <div className="size-20 mx-auto mb-6 rounded-full bg-primary/10 flex items-center justify-center">
            <Crown className="size-10 text-primary" />
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-3">
            {minLevel === 'ultra' ? 'Ultra 会员专享' : '会员专享功能'}
          </h2>
          <p className="text-muted-foreground mb-8">
            书案工作台为会员专属功能，开通{minLevel === 'ultra' ? 'Ultra ' : ''}会员后即可解锁全部创作能力。
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              className="bg-gradient-to-r from-primary to-amber-500 text-primary-foreground hover:from-primary/90 hover:to-amber-500/90"
              onClick={() => navigate('/redemption')}
            >
              <Crown className="size-4 mr-2" />
              立即开通
              <ArrowRight className="size-4 ml-2" />
            </Button>
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
