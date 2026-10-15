import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  PenTool,
  Home,
  BookMarked,
  BookOpen,
  TrendingUp,
  Sparkles,
  ScrollText,
  User,
  LogOut,
  Settings,
  Menu,
  X,
  Crown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useAuth } from '@/lib/auth-context';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';

const NAV_ITEMS = [
  { path: '/', label: '首页', icon: Home },
  { path: '/library', label: '藏书阁', icon: BookMarked },
  { path: '/write', label: '短篇创作', icon: PenTool },
  { path: '/disassemble', label: '拆书分析', icon: BookOpen },
  { path: '/hot-rank', label: '网文扫榜', icon: TrendingUp },
  { path: '/optimize', label: '去 AI 味', icon: Sparkles },
];

export default function Header() {
  const navigate = useNavigate();
  const { isLoggedIn, account, logout, isAdmin, isLoading, isMember, isUltra } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    toast.success('已退出登录');
    navigate('/login', { replace: true });
  };

  const memberLabel = isUltra ? 'Ultra' : isMember ? 'Plus' : '';

  return (
    <header className="sticky top-0 z-50 w-full bg-background/70 backdrop-blur-xl border-b border-primary/15">
      <div className="max-w-7xl mx-auto px-4 md:px-6 flex h-16 items-center justify-between">
        <div className="flex items-center gap-6">
          <NavLink to="/" className="flex items-center gap-2 shrink-0">
            <div className="size-9 rounded-lg bg-gradient-to-br from-primary to-amber-500 flex items-center justify-center text-primary-foreground font-bold text-lg shadow-md shadow-primary/25">
              <ScrollText className="size-5" />
            </div>
            <span className="text-lg font-bold text-foreground tracking-wide">
              靓文写作
            </span>
          </NavLink>

          <nav className="hidden xl:flex items-center gap-0.5">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path === '/'}
                  className={({ isActive }) =>
                    `flex items-center gap-1.5 px-3 py-2 rounded-md text-sm transition-colors ${
                      isActive
                        ? 'text-primary font-semibold bg-primary/10'
                        : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                    }`
                  }
                >
                  <Icon className="size-4" />
                  {item.label}
                </NavLink>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          {!isLoading && isLoggedIn ? (
            <>
              {/* 会员入口 */}
              {!isMember && (
                <Button
                  size="sm"
                  className="hidden sm:flex bg-gradient-to-r from-primary to-amber-500 text-primary-foreground hover:from-primary/90 hover:to-amber-500/90 shadow-md shadow-primary/20"
                  onClick={() => navigate('/redemption')}
                >
                  <Crown className="size-4 mr-1.5" />
                  开通会员
                </Button>
              )}
              {isMember && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="hidden sm:flex items-center gap-1.5 text-primary hover:text-primary hover:bg-primary/10"
                  onClick={() => navigate('/redemption')}
                >
                  <Crown className="size-4" />
                  <span className="font-medium">{memberLabel}</span>
                </Button>
              )}

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex items-center gap-2 h-9 px-2 hover:bg-accent"
                  >
                    <Avatar className="size-7">
                      <AvatarFallback className="bg-gradient-to-br from-primary to-amber-500 text-primary-foreground text-xs font-semibold">
                        {account ? account.charAt(0).toUpperCase() : <User className="size-4" />}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium text-foreground max-w-[100px] truncate hidden sm:block">
                      {account}
                    </span>
                    {isMember && (
                      <Badge
                        variant="outline"
                        className={`hidden md:flex text-[10px] h-5 px-1.5 ${
                          isUltra
                            ? 'border-purple-400/50 text-purple-600 bg-purple-50/50'
                            : 'border-primary/40 text-primary bg-primary/5'
                        }`}
                      >
                        <Crown className="size-3 mr-0.5" />
                        {memberLabel}
                      </Badge>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52">
                  <DropdownMenuLabel className="text-muted-foreground font-normal">
                    当前账号
                  </DropdownMenuLabel>
                  <div className="px-2 pb-2">
                    <div className="flex items-center gap-2 px-2 py-1.5">
                      <User className="size-4 text-muted-foreground" />
                      <span className="text-sm font-medium text-foreground truncate">{account}</span>
                    </div>
                    {isMember && (
                      <div className="flex items-center gap-2 px-2 py-1">
                        <Crown className={`size-4 ${isUltra ? 'text-purple-500' : 'text-primary'}`} />
                        <span className={`text-xs font-medium ${isUltra ? 'text-purple-600' : 'text-primary'}`}>
                          {memberLabel} 会员
                        </span>
                      </div>
                    )}
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate('/library')}>
                    <BookMarked className="size-4 mr-2" />
                    我的藏书阁
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/redemption')}>
                    <Crown className="size-4 mr-2" />
                    {isMember ? '会员中心 / 续费' : '开通会员'}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/settings')}>
                    <Settings className="size-4 mr-2" />
                    账号设置
                  </DropdownMenuItem>
                  {isAdmin && (
                    <DropdownMenuItem onClick={() => navigate('/admin')}>
                      <Settings className="size-4 mr-2" />
                      管理后台
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleLogout}
                    className="text-destructive focus:text-destructive cursor-pointer"
                  >
                    <LogOut className="size-4 mr-2" />
                    退出登录
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            !isLoading && (
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate('/login')}
                >
                  登录
                </Button>
                <Button
                  size="sm"
                  className="bg-gradient-to-r from-primary to-amber-500 text-primary-foreground hover:from-primary/90 hover:to-amber-500/90 shadow-md shadow-primary/20"
                  onClick={() => navigate('/register')}
                >
                  注册
                </Button>
              </div>
            )
          )}

          {/* 移动端菜单按钮 */}
          <Button
            variant="ghost"
            size="icon"
            className="xl:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </Button>
        </div>
      </div>

      {/* 移动端导航菜单 */}
      {mobileMenuOpen && (
        <div className="xl:hidden border-t border-border/40 bg-background/95 backdrop-blur-md">
          <nav className="max-w-7xl mx-auto px-4 py-2 flex flex-col">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path === '/'}
                  onClick={() => setMobileMenuOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-2 px-3 py-2.5 rounded-md text-sm ${
                      isActive
                        ? 'text-primary font-semibold bg-primary/10'
                        : 'text-foreground hover:bg-accent'
                    }`
                  }
                >
                  <Icon className="size-4" />
                  {item.label}
                </NavLink>
              );
            })}
            {isLoggedIn && (
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  navigate('/redemption');
                }}
                className="flex items-center gap-2 px-3 py-2.5 rounded-md text-sm text-primary hover:bg-primary/10 text-left"
              >
                <Crown className="size-4" />
                {isMember ? '会员中心 / 续费' : '开通会员'}
              </button>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
