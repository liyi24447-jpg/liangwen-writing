import { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Users,
  Shield,
  Settings,
  RefreshCw,
  Search,
  UserPlus,
  Trash2,
  Lock,
  Check,
  X,
  Crown,
  Megaphone,
  Ticket,
  Plus,
  Copy,
  Calendar,
  KeyRound,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollText, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import {
  apiAdminStats,
  apiAdminUserList,
  apiAdminUserDisable,
  apiAdminUserResetPassword,
  apiAdminUserDelete,
  apiAdminUpdateUserPermissions,
  apiAdminGetLevelPermissions,
  apiAdminUpdateLevelPermission,
  apiAdminSetUserMembership,
  apiAdminExtendMembership,
  apiAdminGetAnnouncement,
  apiAdminSaveAnnouncement,
  apiAdminRedemptionCodeList,
  apiAdminGenerateRedemptionCodes,
  apiAdminToggleRedemptionCode,
  apiAdminDeleteRedemptionCode,
  apiAdminPasswordResetCodeList,
  apiAdminGeneratePasswordResetCodes,
  apiAdminTogglePasswordResetCode,
  apiAdminDeletePasswordResetCode,
  type UserPermissions,
  type MembershipLevel,
  type Announcement,
  type RedemptionCode,
  type PasswordResetCode,
  type AdminUserItem,
  type AdminStats,
  type LevelPermissionsMap,
} from '@/lib/api-client';
import { PERMISSION_LABELS, type PermissionKey } from '@/lib/permissions';
import { toast } from 'sonner';
import { format, addDays } from 'date-fns';
import { cn } from '@/lib/utils';

const ALL_PERMISSION_KEYS: PermissionKey[] = [
  'canWriteShort',
  'canDisassemble',
  'canHotRank',
  'canOptimize',
  'canWorkbench',
  'canUploadContinue',
];

type AdminTab = 'dashboard' | 'users' | 'announcement' | 'redemption' | 'passwordReset' | 'memberPermissions';

const NAV_ITEMS: { key: AdminTab; label: string; icon: typeof LayoutDashboard }[] = [
  { key: 'dashboard', label: '数据概览', icon: LayoutDashboard },
  { key: 'users', label: '用户管理', icon: Users },
  { key: 'memberPermissions', label: '会员权限', icon: ShieldCheck },
  { key: 'announcement', label: '公告管理', icon: Megaphone },
  { key: 'redemption', label: '兑换码管理', icon: Ticket },
  { key: 'passwordReset', label: '改密 CDK', icon: KeyRound },
];

export default function AdminPage() {
  const { isAdmin, isLoading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');
  const [users, setUsers] = useState<AdminUserItem[]>([]);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [usersLoading, setUsersLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [userToToggle, setUserToToggle] = useState<AdminUserItem | null>(null);
  const [userToDelete, setUserToDelete] = useState<AdminUserItem | null>(null);
  const [userToReset, setUserToReset] = useState<AdminUserItem | null>(null);
  const [resetPassword, setResetPassword] = useState('');
  const [userToPermit, setUserToPermit] = useState<AdminUserItem | null>(null);
  const [tempPerms, setTempPerms] = useState<Record<PermissionKey, boolean>>({
    canWriteShort: true,
    canDisassemble: true,
    canHotRank: true,
    canOptimize: true,
    canWorkbench: true,
    canUploadContinue: true,
  });

  // 会员设置
  const [userToMember, setUserToMember] = useState<AdminUserItem | null>(null);
  const [memberLevel, setMemberLevel] = useState<MembershipLevel>('plus');
  const [memberDays, setMemberDays] = useState(30);
  const [memberAction, setMemberAction] = useState<'set' | 'extend' | 'cancel'>('set');
  const [memberSubmitting, setMemberSubmitting] = useState(false);

  // 公告
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [announcementLoading, setAnnouncementLoading] = useState(true);
  const [announcementTitle, setAnnouncementTitle] = useState('');
  const [announcementContent, setAnnouncementContent] = useState('');
  const [announcementEnabled, setAnnouncementEnabled] = useState(false);
  const [announcementSubmitting, setAnnouncementSubmitting] = useState(false);

  // 兑换码
  const [codes, setCodes] = useState<RedemptionCode[]>([]);
  const [codesLoading, setCodesLoading] = useState(true);
  const [genDialogOpen, setGenDialogOpen] = useState(false);
  const [genCount, setGenCount] = useState(10);
  const [genLevel, setGenLevel] = useState<MembershipLevel>('plus');
  const [genDays, setGenDays] = useState(30);
  const [genSubmitting, setGenSubmitting] = useState(false);
  const [codeToDelete, setCodeToDelete] = useState<RedemptionCode | null>(null);

  // 改密 CDK
  const [resetCodes, setResetCodes] = useState<PasswordResetCode[]>([]);
  const [resetCodesLoading, setResetCodesLoading] = useState(true);
  const [genResetDialogOpen, setGenResetDialogOpen] = useState(false);
  const [genResetCount, setGenResetCount] = useState(10);
  const [genResetPrefix, setGenResetPrefix] = useState('');
  const [genResetSubmitting, setGenResetSubmitting] = useState(false);
  const [resetCodeToDelete, setResetCodeToDelete] = useState<PasswordResetCode | null>(null);

  // 等级权限
  const [levelPerms, setLevelPerms] = useState<LevelPermissionsMap | null>(null);
  const [levelPermsLoading, setLevelPermsLoading] = useState(true);
  const [levelPermSaving, setLevelPermSaving] = useState<'none' | 'plus' | 'ultra' | null>(null);

  const loadLevelPermissions = async () => {
    setLevelPermsLoading(true);
    setLoadError(null);
    try {
      const res = await apiAdminGetLevelPermissions();
      if (res.success && res.data) {
        setLevelPerms(res.data);
      } else {
        setLoadError(res.message || '加载等级权限失败');
      }
    } catch (err) {
      setLoadError('加载等级权限失败');
    } finally {
      setLevelPermsLoading(false);
    }
  };

  const handleLevelPermChange = (level: 'none' | 'plus' | 'ultra', key: PermissionKey, value: boolean) => {
    setLevelPerms((prev) => {
      if (!prev) return prev;
      return { ...prev, [level]: { ...prev[level], [key]: value } };
    });
  };

  const handleSaveLevelPerms = async (level: 'none' | 'plus' | 'ultra') => {
    if (!levelPerms) return;
    setLevelPermSaving(level);
    try {
      const res = await apiAdminUpdateLevelPermission(level, levelPerms[level]);
      if (res.success) {
        toast.success(`${level === 'none' ? '普通用户' : level === 'plus' ? 'Plus 会员' : 'Ultra 会员'} 权限已保存`);
      } else {
        toast.error(res.message || '保存失败');
      }
    } catch {
      toast.error('保存失败，请重试');
    } finally {
      setLevelPermSaving(null);
    }
  };

  // ===== 加载 =====
  const loadStats = async () => {
    setStatsLoading(true);
    setLoadError(null);
    try {
      const res = await apiAdminStats();
      if (res.success && res.data) {
        setStats(res.data);
      } else {
        setLoadError(res.message || '加载数据失败');
      }
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : '数据加载异常，请刷新重试');
    } finally {
      setStatsLoading(false);
    }
  };

  const loadUsers = async () => {
    setUsersLoading(true);
    try {
      const res = await apiAdminUserList();
      if (res.success && res.data) {
        setUsers(res.data);
      } else {
        toast.error(res.message || '加载用户列表失败');
      }
    } catch {
      toast.error('加载用户列表失败，请刷新重试');
    } finally {
      setUsersLoading(false);
    }
  };

  const loadAnnouncement = async () => {
    setAnnouncementLoading(true);
    try {
      const res = await apiAdminGetAnnouncement();
      if (res.success) {
        const data = res.data;
        setAnnouncement(data);
        if (data) {
          setAnnouncementTitle(data.title);
          setAnnouncementContent(data.content);
          setAnnouncementEnabled(data.isEnabled);
        }
      }
    } catch {
      toast.error('加载公告失败');
    } finally {
      setAnnouncementLoading(false);
    }
  };

  const loadRedemptionCodes = async () => {
    setCodesLoading(true);
    try {
      const res = await apiAdminRedemptionCodeList();
      if (res.success && res.data) {
        setCodes(res.data);
      }
    } catch {
      toast.error('加载兑换码失败');
    } finally {
      setCodesLoading(false);
    }
  };

  const loadPasswordResetCodes = async () => {
    setResetCodesLoading(true);
    try {
      const res = await apiAdminPasswordResetCodeList();
      if (res.success && res.data) {
        setResetCodes(res.data);
      }
    } catch {
      toast.error('加载改密 CDK 失败');
    } finally {
      setResetCodesLoading(false);
    }
  };

  useEffect(() => {
    if (!isAdmin && !authLoading) return;
    if (isAdmin) {
      loadStats();
      loadUsers();
    }
  }, [isAdmin, authLoading]);

  useEffect(() => {
    if (!isAdmin || authLoading) return;
    if (activeTab === 'announcement') loadAnnouncement();
    if (activeTab === 'redemption') loadRedemptionCodes();
    if (activeTab === 'passwordReset') loadPasswordResetCodes();
    if (activeTab === 'memberPermissions') loadLevelPermissions();
  }, [activeTab, isAdmin, authLoading]);

  // ===== 用户操作 =====
  const handleToggleStatus = async (user: AdminUserItem) => {
    const res = await apiAdminUserDisable(user.id, !user.isActive);
    if (res.success) {
      toast.success(res.message || '操作成功');
      loadUsers();
      loadStats();
    } else {
      toast.error(res.message || '操作失败');
    }
    setUserToToggle(null);
  };

  const handleDelete = async (user: AdminUserItem) => {
    const res = await apiAdminUserDelete(user.id);
    if (res.success) {
      toast.success(res.message || '已删除');
      loadUsers();
      loadStats();
    } else {
      toast.error(res.message || '删除失败');
    }
    setUserToDelete(null);
  };

  const handleResetPassword = async () => {
    if (!userToReset || !resetPassword) return;
    const res = await apiAdminUserResetPassword(userToReset.id, resetPassword);
    if (res.success) {
      toast.success('密码重置成功');
      setUserToReset(null);
      setResetPassword('');
    } else {
      toast.error(res.message || '重置失败');
    }
  };

  const openPermDialog = (user: AdminUserItem) => {
    setUserToPermit(user);
    setTempPerms({
      canWriteShort: user.permissions.canWriteShort,
      canDisassemble: user.permissions.canDisassemble,
      canHotRank: user.permissions.canHotRank,
      canOptimize: user.permissions.canOptimize,
      canWorkbench: user.permissions.canWorkbench,
      canUploadContinue: user.permissions.canUploadContinue,
    });
  };

  const handleSavePerms = async () => {
    if (!userToPermit) return;
    const res = await apiAdminUpdateUserPermissions(userToPermit.id, tempPerms);
    if (res.success) {
      toast.success('权限更新成功');
      loadUsers();
      setUserToPermit(null);
    } else {
      toast.error(res.message || '保存失败');
    }
  };

  // ===== 会员操作 =====
  const openMemberDialog = (user: AdminUserItem) => {
    setUserToMember(user);
    setMemberLevel(user.membershipLevel === 'none' ? 'plus' : user.membershipLevel);
    setMemberDays(30);
    setMemberAction('set');
  };

  const handleMemberSubmit = async () => {
    if (!userToMember || memberSubmitting) return;
    setMemberSubmitting(true);
    try {
      let res;
      if (memberAction === 'cancel') {
        // 取消会员 = 设置等级为 none，0 天
        res = await apiAdminSetUserMembership(userToMember.id, 'none', 0);
      } else if (memberAction === 'extend') {
        res = await apiAdminExtendMembership(userToMember.id, memberDays);
      } else {
        res = await apiAdminSetUserMembership(userToMember.id, memberLevel, memberDays);
      }
      if (res.success) {
        toast.success('会员设置成功');
        loadUsers();
        setUserToMember(null);
      } else {
        toast.error(res.message || '设置失败');
      }
    } finally {
      setMemberSubmitting(false);
    }
  };

  // ===== 公告操作 =====
  const handleSaveAnnouncement = async () => {
    if (announcementSubmitting) return;
    if (!announcementTitle.trim()) {
      toast.error('请输入公告标题');
      return;
    }
    setAnnouncementSubmitting(true);
    try {
      const res = await apiAdminSaveAnnouncement({
        title: announcementTitle.trim(),
        content: announcementContent.trim(),
        isEnabled: announcementEnabled,
      });
      if (res.success) {
        toast.success('公告已保存');
        loadAnnouncement();
      } else {
        toast.error(res.message || '保存失败');
      }
    } finally {
      setAnnouncementSubmitting(false);
    }
  };

  // ===== 兑换码操作 =====
  const handleGenerateCodes = async () => {
    if (genSubmitting) return;
    if (genCount < 1 || genCount > 100) {
      toast.error('生成数量应在 1-100 之间');
      return;
    }
    setGenSubmitting(true);
    try {
      const res = await apiAdminGenerateRedemptionCodes({
        count: genCount,
        level: genLevel,
        days: genDays,
      });
      if (res.success && res.data) {
        toast.success(`成功生成 ${res.data.length} 个兑换码`);
        loadRedemptionCodes();
        setGenDialogOpen(false);
      } else {
        toast.error(res.message || '生成失败');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '生成异常，请刷新重试');
    } finally {
      setGenSubmitting(false);
    }
  };

  const handleToggleCode = async (code: RedemptionCode) => {
    const res = await apiAdminToggleRedemptionCode(code.id);
    if (res.success && res.data) {
      setCodes((prev) =>
        prev.map((c) =>
          c.id === code.id ? { ...c, isActive: res.data!.isActive } : c
        )
      );
      toast.success(res.data.isActive ? '已启用' : '已停用');
    } else {
      toast.error(res.message || '操作失败');
    }
  };

  const handleDeleteCode = async (code: RedemptionCode) => {
    const res = await apiAdminDeleteRedemptionCode(code.id);
    if (res.success) {
      setCodes((prev) => prev.filter((c) => c.id !== code.id));
      toast.success('已删除');
    } else {
      toast.error(res.message || '删除失败');
    }
    setCodeToDelete(null);
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code).then(
      () => toast.success('已复制'),
      () => toast.error('复制失败')
    );
  };

  // ===== 改密 CDK 操作 =====
  const handleGenerateResetCodes = async () => {
    if (genResetSubmitting) return;
    if (genResetCount < 1 || genResetCount > 100) {
      toast.error('生成数量应在 1-100 之间');
      return;
    }
    setGenResetSubmitting(true);
    try {
      const res = await apiAdminGeneratePasswordResetCodes({
        count: genResetCount,
        prefix: genResetPrefix.trim() || undefined,
      });
      if (res.success && res.data) {
        toast.success(`成功生成 ${res.data.length} 个改密 CDK`);
        loadPasswordResetCodes();
        setGenResetDialogOpen(false);
      } else {
        toast.error(res.message || '生成失败');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '生成异常，请刷新重试');
    } finally {
      setGenResetSubmitting(false);
    }
  };

  const handleToggleResetCode = async (code: PasswordResetCode) => {
    const res = await apiAdminTogglePasswordResetCode(code.id);
    if (res.success && res.data) {
      setResetCodes((prev) =>
        prev.map((c) => (c.id === code.id ? { ...c, isActive: res.data!.isActive } : c))
      );
      toast.success(res.data.isActive ? '已启用' : '已停用');
    } else {
      toast.error(res.message || '操作失败');
    }
  };

  const handleDeleteResetCode = async (code: PasswordResetCode) => {
    const res = await apiAdminDeletePasswordResetCode(code.id);
    if (res.success) {
      setResetCodes((prev) => prev.filter((c) => c.id !== code.id));
      toast.success('已删除');
    } else {
      toast.error(res.message || '删除失败');
    }
    setResetCodeToDelete(null);
  };

  const filteredUsers = users.filter((u) =>
    u.account.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // 工具：会员等级展示
  const memberBadge = (level: MembershipLevel, expireAt: number) => {
    if (level === 'ultra') {
      return (
        <Badge className="bg-purple-500/90 text-white border-0">
          <Crown className="size-3 mr-1" />
          Ultra
        </Badge>
      );
    }
    if (level === 'plus') {
      return (
        <Badge className="bg-primary/90 text-primary-foreground border-0">
          <Crown className="size-3 mr-1" />
          Plus
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="text-muted-foreground">
        普通用户
      </Badge>
    );
  };

  // 未登录或非管理员
  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">加载中...</div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="size-20 mx-auto mb-6 rounded-full bg-destructive/10 flex items-center justify-center">
            <Shield className="size-10 text-destructive" />
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-2">无访问权限</h2>
          <p className="text-muted-foreground">请使用管理员账号登录</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-background">
      {/* 顶部 */}
      <header className="sticky top-0 z-40 border-b border-primary/15 bg-background/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="size-9 rounded-lg bg-gradient-to-br from-primary to-amber-500 flex items-center justify-center text-primary-foreground">
              <ScrollText className="size-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground">管理后台</h1>
              <p className="text-xs text-muted-foreground">靓文写作 · Admin</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={() => window.history.back()}>
            返回
          </Button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 space-y-4 md:space-y-0 md:flex md:gap-6">
        {/* 移动端 tab 切换 */}
        <div className="md:hidden overflow-x-auto">
          <div className="flex rounded-lg border border-border/50 bg-card/50 p-1 gap-1 min-w-max">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.key;
              return (
                <button
                  key={item.key}
                  onClick={() => setActiveTab(item.key)}
                  className={cn(
                    'flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm transition-colors whitespace-nowrap',
                    isActive
                      ? 'bg-primary text-primary-foreground font-medium shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  <Icon className="size-4" />
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* 左侧导航（桌面端） */}
        <aside className="hidden md:block w-56 shrink-0">
          <div className="space-y-1">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.key}
                  onClick={() => setActiveTab(item.key)}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors text-left',
                    activeTab === item.key
                      ? 'bg-primary/10 text-primary font-semibold'
                      : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                  )}
                >
                  <Icon className="size-4" />
                  {item.label}
                </button>
              );
            })}
          </div>
        </aside>

        {/* 主内容 */}
        <main className="flex-1 min-w-0">
          {/* ===== 数据概览 ===== */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-foreground">数据概览</h2>

              {statsLoading ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[1, 2, 3, 4].map((i) => (
                    <Card key={i} className="border-primary/10 bg-card/60 backdrop-blur-sm">
                      <CardContent className="p-5 space-y-2">
                        <div className="h-4 bg-muted/50 rounded w-24 animate-pulse" />
                        <div className="h-8 bg-muted/50 rounded w-16 animate-pulse" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : loadError ? (
                <Card className="border-destructive/30 bg-destructive/5">
                  <CardContent className="p-6 text-center">
                    <p className="text-destructive mb-3">{loadError}</p>
                    <Button size="sm" variant="outline" onClick={loadStats}>
                      <RefreshCw className="size-4 mr-2" />
                      重新加载
                    </Button>
                  </CardContent>
                </Card>
              ) : stats ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: '注册用户总数', value: stats.totalUsers, icon: Users },
                    { label: '活跃用户数', value: stats.activeUsers, icon: UserPlus },
                    { label: '管理员数', value: stats.adminUsers, icon: Shield },
                    { label: '作品总数', value: stats.totalBooks, icon: ScrollText },
                  ].map((item) => {
                    const Icon = item.icon;
                    return (
                      <Card key={item.label} className="border-primary/10 bg-card/60 backdrop-blur-sm">
                        <CardContent className="p-5">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm text-muted-foreground">{item.label}</span>
                            <Icon className="size-5 text-primary/60" />
                          </div>
                          <div className="text-2xl font-bold text-foreground tabular-nums">
                            {item.value}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              ) : null}

              <Card className="border-primary/10 bg-card/60 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-lg">管理员提示</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-muted-foreground">
                  <p>
                    • 请定期修改默认管理员密码，确保账号安全。
                  </p>
                  <p>
                    • 默认管理员账号：<code className="bg-muted px-1.5 py-0.5 rounded text-foreground">admin</code> /{' '}
                    <code className="bg-muted px-1.5 py-0.5 rounded text-foreground">admin123456</code>
                  </p>
                  <p>• 功能权限可按用户单独配置，关闭后用户进入对应功能会提示无权限（导航入口仍可见）。</p>
                  <p>• 会员体系分为 Plus 和 Ultra 两档，可通过兑换码或管理后台设置。</p>
                  <p>• 禁用账号后用户将无法登录，但作品数据仍然保留。</p>
                </CardContent>
              </Card>

              <Card className="border-amber-400/40 bg-amber-50/50 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-lg text-amber-700 flex items-center gap-2">
                    <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    关于跨设备数据同步
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm text-amber-800/80">
                  <p>当前部署模式为前端预览模式，用户数据存储在浏览器本地，<strong>无法跨设备同步</strong>。</p>
                  <p>本应用已内置完整的 Express + SQLite 全栈后端，支持：</p>
                  <ul className="list-disc list-inside space-y-1 pl-2">
                    <li>账号注册 / 登录 / 密码管理</li>
                    <li>作品数据云端存储（藏书阁、章节、人物设定）</li>
                    <li>会员体系（Plus / Ultra）与兑换码系统</li>
                    <li>公告系统与管理后台</li>
                  </ul>
                  <p className="pt-2">
                    <strong>启用全栈模式：</strong>将应用部署类型切换为支持后端运行的模式（如 Node 服务部署），
                    启动 <code className="bg-amber-100 px-1.5 py-0.5 rounded">server/</code> 目录下的 Express 服务，
                    前端自动通过 <code className="bg-amber-100 px-1.5 py-0.5 rounded">/api</code> 调用真实后端，
                    即可实现账号与作品数据的跨设备同步。
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* ===== 用户管理 ===== */}
          {activeTab === 'users' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <h2 className="text-2xl font-bold text-foreground">用户管理</h2>
                <Button variant="outline" size="sm" onClick={loadUsers}>
                  <RefreshCw className="size-4 mr-2" />
                  刷新
                </Button>
              </div>

              <div className="relative w-full md:w-72">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="搜索账号"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-background pl-9"
                />
              </div>

              <Card className="border-primary/10 bg-card/60 backdrop-blur-sm overflow-hidden">
                <div className="w-full overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border/40 bg-muted/30">
                        <th className="text-left font-medium text-muted-foreground px-4 py-3 whitespace-nowrap">账号</th>
                        <th className="text-left font-medium text-muted-foreground px-4 py-3 whitespace-nowrap">角色</th>
                        <th className="text-left font-medium text-muted-foreground px-4 py-3 whitespace-nowrap">会员</th>
                        <th className="text-left font-medium text-muted-foreground px-4 py-3 whitespace-nowrap">状态</th>
                        <th className="text-left font-medium text-muted-foreground px-4 py-3 whitespace-nowrap">注册时间</th>
                        <th className="text-right font-medium text-muted-foreground px-4 py-3 whitespace-nowrap">操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {usersLoading ? (
                        <tr>
                          <td colSpan={6} className="text-center py-12 text-muted-foreground">
                            加载中...
                          </td>
                        </tr>
                      ) : filteredUsers.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="text-center py-12 text-muted-foreground">
                            暂无用户
                          </td>
                        </tr>
                      ) : (
                        filteredUsers.map((user) => (
                          <tr key={user.id} className="border-b border-border/20 last:border-0 hover:bg-accent/30">
                            <td className="px-4 py-3 font-medium text-foreground">{user.account}</td>
                            <td className="px-4 py-3">
                              {user.isAdmin ? (
                                <Badge variant="default" className="bg-primary/90">管理员</Badge>
                              ) : (
                                <Badge variant="outline" className="text-muted-foreground">普通用户</Badge>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              {memberBadge(user.membershipLevel, user.membershipExpireAt)}
                              {user.membershipLevel !== 'none' && user.membershipExpireAt > 0 && (
                                <div className="text-xs text-muted-foreground mt-1 whitespace-nowrap">
                                  至 {format(user.membershipExpireAt, 'yy-MM-dd')}
                                </div>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              {user.isActive ? (
                                <span className="flex items-center gap-1.5 text-success">
                                  <Check className="size-4" /> 已启用
                                </span>
                              ) : (
                                <span className="flex items-center gap-1.5 text-destructive">
                                  <X className="size-4" /> 已禁用
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-muted-foreground whitespace-nowrap tabular-nums">
                              {format(user.createdAt, 'yyyy-MM-dd HH:mm')}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="size-8"
                                  title="会员设置"
                                  onClick={() => openMemberDialog(user)}
                                  disabled={user.isAdmin}
                                >
                                  <Crown className="size-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="size-8"
                                  title="权限配置"
                                  onClick={() => openPermDialog(user)}
                                  disabled={user.isAdmin}
                                >
                                  <Settings className="size-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="size-8"
                                  title="重置密码"
                                  onClick={() => { setUserToReset(user); setResetPassword(''); }}
                                >
                                  <Lock className="size-4" />
                                </Button>
                                {!user.isAdmin && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="size-8"
                                    title={user.isActive ? '禁用账号' : '启用账号'}
                                    onClick={() => setUserToToggle(user)}
                                  >
                                    {user.isActive ? <X className="size-4" /> : <Check className="size-4" />}
                                  </Button>
                                )}
                                {!user.isAdmin && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="size-8 text-destructive hover:text-destructive"
                                    title="删除用户"
                                    onClick={() => setUserToDelete(user)}
                                  >
                                    <Trash2 className="size-4" />
                                  </Button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          )}

          {/* ===== 会员权限 ===== */}
          {activeTab === 'memberPermissions' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <h2 className="text-2xl font-bold text-foreground">会员权限配置</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    按会员等级配置功能权限。账号单独配置的权限项可覆盖等级默认配置；管理员账号不受限。
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={loadLevelPermissions} disabled={levelPermsLoading}>
                  <RefreshCw className="size-4 mr-2" />
                  刷新
                </Button>
              </div>

              {levelPermsLoading ? (
                <Card className="border-primary/10 bg-card/60 backdrop-blur-sm">
                  <CardContent className="py-16 text-center text-muted-foreground">加载中...</CardContent>
                </Card>
              ) : levelPerms ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {(['none', 'plus', 'ultra'] as const).map((level) => {
                    const label =
                      level === 'none' ? '普通用户' : level === 'plus' ? 'Plus 会员' : 'Ultra 会员';
                    const accent =
                      level === 'none'
                        ? 'text-muted-foreground'
                        : level === 'plus'
                          ? 'text-amber-600'
                          : 'text-purple-600';
                    const cardAccent =
                      level === 'none'
                        ? 'border-border'
                        : level === 'plus'
                          ? 'border-amber-300/40 bg-amber-50/30'
                          : 'border-purple-300/40 bg-purple-50/30';
                    return (
                      <Card key={level} className={`border ${cardAccent} bg-card/60 backdrop-blur-sm`}>
                        <CardHeader>
                          <CardTitle className={`text-lg flex items-center gap-2 ${accent}`}>
                            <ShieldCheck className="size-5" />
                            {label}
                          </CardTitle>
                          <p className="text-xs text-muted-foreground">
                            {level === 'ultra'
                              ? '默认为全开，建议保持全部开启'
                              : '已按等级生效，账号单独配置可覆盖'}
                          </p>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          {ALL_PERMISSION_KEYS.map((key) => (
                            <div
                              key={key}
                              className="flex items-center justify-between gap-3 py-1.5"
                            >
                              <Label htmlFor={`perm-${level}-${key}`} className="text-sm cursor-pointer flex-1">
                                {PERMISSION_LABELS[key]}
                              </Label>
                              <Switch
                                id={`perm-${level}-${key}`}
                                checked={levelPerms[level][key]}
                                onCheckedChange={(v) => handleLevelPermChange(level, key, !!v)}
                              />
                            </div>
                          ))}
                          <div className="pt-3 border-t border-border/40">
                            <Button
                              className="w-full bg-gradient-to-r from-primary to-amber-500 text-primary-foreground hover:from-primary/90 hover:to-amber-500/90"
                              size="sm"
                              onClick={() => handleSaveLevelPerms(level)}
                              disabled={levelPermSaving === level}
                            >
                              {levelPermSaving === level ? '保存中...' : '保存'}
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              ) : null}
            </div>
          )}

          {/* ===== 公告管理 ===== */}
          {activeTab === 'announcement' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-foreground">公告管理</h2>
                <Button variant="outline" size="sm" onClick={loadAnnouncement}>
                  <RefreshCw className="size-4 mr-2" />
                  刷新
                </Button>
              </div>

              <Card className="border-primary/10 bg-card/60 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Megaphone className="size-5 text-primary" />
                    站点公告
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                  {announcementLoading ? (
                    <div className="text-center py-8 text-muted-foreground">加载中...</div>
                  ) : (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="ann-title">公告标题</Label>
                        <Input
                          id="ann-title"
                          value={announcementTitle}
                          onChange={(e) => setAnnouncementTitle(e.target.value)}
                          placeholder="请输入公告标题"
                          maxLength={100}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="ann-content">公告正文</Label>
                        <Textarea
                          id="ann-content"
                          value={announcementContent}
                          onChange={(e) => setAnnouncementContent(e.target.value)}
                          placeholder="请输入公告内容，支持换行"
                          rows={8}
                          className="resize-none"
                        />
                      </div>

                      <div className="flex items-center justify-between py-3 px-4 rounded-lg bg-muted/30 border border-border/40">
                        <div>
                          <div className="text-sm font-medium text-foreground">启用公告</div>
                          <div className="text-xs text-muted-foreground">
                            启用后，所有登录用户首次进入时会弹出公告弹窗
                          </div>
                        </div>
                        <Switch
                          checked={announcementEnabled}
                          onCheckedChange={setAnnouncementEnabled}
                        />
                      </div>

                      <div className="flex justify-end gap-3 pt-2">
                        <Button
                          variant="outline"
                          onClick={() => {
                            setAnnouncementTitle('');
                            setAnnouncementContent('');
                            setAnnouncementEnabled(false);
                          }}
                        >
                          清空
                        </Button>
                        <Button
                          className="bg-gradient-to-r from-primary to-amber-500 text-primary-foreground hover:from-primary/90 hover:to-amber-500/90"
                          onClick={handleSaveAnnouncement}
                          disabled={announcementSubmitting}
                        >
                          {announcementSubmitting ? '保存中...' : '保存公告'}
                        </Button>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* ===== 兑换码管理 ===== */}
          {activeTab === 'redemption' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <h2 className="text-2xl font-bold text-foreground">兑换码管理</h2>
                <Button
                  className="bg-gradient-to-r from-primary to-amber-500 text-primary-foreground hover:from-primary/90 hover:to-amber-500/90"
                  size="sm"
                  onClick={() => {
                    setGenCount(10);
                    setGenLevel('plus');
                    setGenDays(30);
                    setGenDialogOpen(true);
                  }}
                >
                  <Plus className="size-4 mr-2" />
                  生成兑换码
                </Button>
              </div>

              <Card className="border-primary/10 bg-card/60 backdrop-blur-sm overflow-hidden">
                <div className="w-full overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border/40 bg-muted/30">
                        <th className="text-left font-medium text-muted-foreground px-4 py-3 whitespace-nowrap">兑换码</th>
                        <th className="text-left font-medium text-muted-foreground px-4 py-3 whitespace-nowrap">等级</th>
                        <th className="text-left font-medium text-muted-foreground px-4 py-3 whitespace-nowrap">有效期</th>
                        <th className="text-left font-medium text-muted-foreground px-4 py-3 whitespace-nowrap">状态</th>
                        <th className="text-left font-medium text-muted-foreground px-4 py-3 whitespace-nowrap">创建时间</th>
                        <th className="text-right font-medium text-muted-foreground px-4 py-3 whitespace-nowrap">操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {codesLoading ? (
                        <tr>
                          <td colSpan={6} className="text-center py-12 text-muted-foreground">
                            加载中...
                          </td>
                        </tr>
                      ) : codes.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="text-center py-12 text-muted-foreground">
                            暂无兑换码，点击右上角生成
                          </td>
                        </tr>
                      ) : (
                        codes.map((code) => (
                          <tr key={code.id} className="border-b border-border/20 last:border-0 hover:bg-accent/30">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <code className="bg-muted px-2 py-0.5 rounded text-foreground font-mono text-xs">
                                  {code.code}
                                </code>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="size-6"
                                  onClick={() => copyCode(code.code)}
                                >
                                  <Copy className="size-3" />
                                </Button>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              {code.membershipLevel === 'ultra' ? (
                                <Badge className="bg-purple-500/90 text-white border-0">Ultra</Badge>
                              ) : (
                                <Badge className="bg-primary/90 text-primary-foreground border-0">Plus</Badge>
                              )}
                            </td>
                            <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                              {code.days} 天
                            </td>
                            <td className="px-4 py-3">
                              {code.isActive ? (
                                <span className="flex items-center gap-1.5 text-success">
                                  <Check className="size-4" /> 启用中
                                </span>
                              ) : code.isUsed ? (
                                <span className="flex items-center gap-1.5 text-muted-foreground">
                                  已兑换
                                </span>
                              ) : (
                                <span className="flex items-center gap-1.5 text-destructive">
                                  <X className="size-4" /> 已停用
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-muted-foreground whitespace-nowrap tabular-nums">
                              {format(code.createdAt, 'yyyy-MM-dd HH:mm')}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center justify-end gap-1">
                                {code.isActive && !code.isUsed && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="size-8"
                                    title="停用"
                                    onClick={() => handleToggleCode(code)}
                                  >
                                    <X className="size-4" />
                                  </Button>
                                )}
                                {!code.isActive && !code.isUsed && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="size-8 text-success"
                                    title="启用"
                                    onClick={() => handleToggleCode(code)}
                                  >
                                    <Check className="size-4" />
                                  </Button>
                                )}
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="size-8 text-destructive hover:text-destructive"
                                  title="删除"
                                  onClick={() => setCodeToDelete(code)}
                                >
                                  <Trash2 className="size-4" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          )}

          {activeTab === 'passwordReset' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <h2 className="text-2xl font-bold text-foreground">改密 CDK 管理</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    用户关注微信公众号《靓文写作》获取 CDK，凭 CDK 修改密码
                  </p>
                </div>
                <Button
                  className="bg-gradient-to-r from-primary to-amber-500 text-primary-foreground hover:from-primary/90 hover:to-amber-500/90"
                  size="sm"
                  onClick={() => {
                    setGenResetCount(10);
                    setGenResetPrefix('');
                    setGenResetDialogOpen(true);
                  }}
                >
                  <Plus className="size-4 mr-2" />
                  生成改密 CDK
                </Button>
              </div>

              <Card className="border-primary/10 bg-card/60 backdrop-blur-sm overflow-hidden">
                <div className="w-full overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border/40 bg-muted/30">
                        <th className="text-left font-medium text-muted-foreground px-4 py-3 whitespace-nowrap">CDK</th>
                        <th className="text-left font-medium text-muted-foreground px-4 py-3 whitespace-nowrap">状态</th>
                        <th className="text-left font-medium text-muted-foreground px-4 py-3 whitespace-nowrap">使用者</th>
                        <th className="text-left font-medium text-muted-foreground px-4 py-3 whitespace-nowrap">创建时间</th>
                        <th className="text-right font-medium text-muted-foreground px-4 py-3 whitespace-nowrap">操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {resetCodesLoading ? (
                        <tr>
                          <td colSpan={5} className="text-center py-12 text-muted-foreground">
                            加载中...
                          </td>
                        </tr>
                      ) : resetCodes.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="text-center py-12 text-muted-foreground">
                            暂无 CDK，点击右上角生成
                          </td>
                        </tr>
                      ) : (
                        resetCodes.map((code) => (
                          <tr key={code.id} className="border-b border-border/20 last:border-0 hover:bg-accent/30">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <code className="bg-muted px-2 py-0.5 rounded text-foreground font-mono text-xs">
                                  {code.code}
                                </code>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="size-6"
                                  onClick={() => copyCode(code.code)}
                                >
                                  <Copy className="size-3" />
                                </Button>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              {code.isActive ? (
                                <span className="flex items-center gap-1.5 text-success">
                                  <Check className="size-4" /> 未使用
                                </span>
                              ) : code.isUsed ? (
                                <span className="flex items-center gap-1.5 text-muted-foreground">
                                  已使用
                                </span>
                              ) : (
                                <span className="flex items-center gap-1.5 text-destructive">
                                  <X className="size-4" /> 已停用
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                              {code.isUsed && code.usedAccount ? code.usedAccount : '—'}
                            </td>
                            <td className="px-4 py-3 text-muted-foreground whitespace-nowrap tabular-nums">
                              {format(code.createdAt, 'yyyy-MM-dd HH:mm')}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center justify-end gap-1">
                                {code.isActive && !code.isUsed && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="size-8"
                                    title="停用"
                                    onClick={() => handleToggleResetCode(code)}
                                  >
                                    <X className="size-4" />
                                  </Button>
                                )}
                                {!code.isActive && !code.isUsed && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="size-8 text-success"
                                    title="启用"
                                    onClick={() => handleToggleResetCode(code)}
                                  >
                                    <Check className="size-4" />
                                  </Button>
                                )}
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="size-8 text-destructive hover:text-destructive"
                                  title="删除"
                                  onClick={() => setResetCodeToDelete(code)}
                                >
                                  <Trash2 className="size-4" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          )}
        </main>
      </div>

      {/* 禁用/启用确认 */}
      <AlertDialog open={!!userToToggle} onOpenChange={(o) => !o && setUserToToggle(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {userToToggle?.isActive ? '禁用账号' : '启用账号'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              确定要{userToToggle?.isActive ? '禁用' : '启用'}账号 <strong>{userToToggle?.account}</strong> 吗？
              {userToToggle?.isActive && '禁用后该用户将无法登录。'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={() => userToToggle && handleToggleStatus(userToToggle)}>
              确定
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 删除用户确认 */}
      <AlertDialog open={!!userToDelete} onOpenChange={(o) => !o && setUserToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>删除用户</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除账号 <strong>{userToDelete?.account}</strong> 吗？
              该操作将同时删除其所有作品数据，且不可恢复。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
              onClick={() => userToDelete && handleDelete(userToDelete)}
            >
              确认删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 删除兑换码确认 */}
      <AlertDialog open={!!codeToDelete} onOpenChange={(o) => !o && setCodeToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>删除兑换码</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除兑换码 <code className="bg-muted px-1.5 py-0.5 rounded">{codeToDelete?.code}</code> 吗？
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
              onClick={() => codeToDelete && handleDeleteCode(codeToDelete)}
            >
              确认删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 删除改密 CDK 确认 */}
      <AlertDialog open={!!resetCodeToDelete} onOpenChange={(o) => !o && setResetCodeToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>删除改密 CDK</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除改密 CDK <code className="bg-muted px-1.5 py-0.5 rounded">{resetCodeToDelete?.code}</code> 吗？
              {resetCodeToDelete && !resetCodeToDelete.isUsed && '删除后该 CDK 将无法被用户使用。'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
              onClick={() => resetCodeToDelete && handleDeleteResetCode(resetCodeToDelete)}
            >
              确认删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 重置密码 */}
      <Dialog open={!!userToReset} onOpenChange={(o) => !o && setUserToReset(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>重置密码 — {userToReset?.account}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="reset-pwd">新密码</Label>
              <Input
                id="reset-pwd"
                type="password"
                value={resetPassword}
                onChange={(e) => setResetPassword(e.target.value)}
                placeholder="请输入新密码（至少 6 位）"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUserToReset(null)}>取消</Button>
            <Button
              className="bg-gradient-to-r from-primary to-amber-500 text-primary-foreground hover:from-primary/90 hover:to-amber-500/90"
              onClick={handleResetPassword}
              disabled={resetPassword.length < 6}
            >
              确认重置
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 权限配置 */}
      <Dialog open={!!userToPermit} onOpenChange={(o) => !o && setUserToPermit(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>功能权限配置 — {userToPermit?.account}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            {ALL_PERMISSION_KEYS.map((key) => (
              <div
                key={key}
                className="flex items-center justify-between py-2 border-b border-border/30 last:border-0"
              >
                <div>
                  <div className="text-sm font-medium text-foreground">
                    {PERMISSION_LABELS[key]}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    开启后该用户可使用此功能
                  </div>
                </div>
                <Switch
                  checked={tempPerms[key]}
                  onCheckedChange={(v) => setTempPerms((p) => ({ ...p, [key]: v }))}
                />
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUserToPermit(null)}>取消</Button>
            <Button
              className="bg-gradient-to-r from-primary to-amber-500 text-primary-foreground hover:from-primary/90 hover:to-amber-500/90"
              onClick={handleSavePerms}
            >
              保存配置
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 会员设置 */}
      <Dialog open={!!userToMember} onOpenChange={(o) => !o && setUserToMember(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>会员设置 — {userToMember?.account}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>操作类型</Label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { key: 'set', label: '设置会员' },
                  { key: 'extend', label: '延长时长' },
                  { key: 'cancel', label: '取消会员' },
                ].map((item) => (
                  <Button
                    key={item.key}
                    type="button"
                    variant={memberAction === item.key ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setMemberAction(item.key as typeof memberAction)}
                    className={memberAction === item.key ? 'bg-primary text-primary-foreground' : ''}
                  >
                    {item.label}
                  </Button>
                ))}
              </div>
            </div>

            {memberAction !== 'cancel' && (
              <>
                {memberAction === 'set' && (
                  <div className="space-y-2">
                    <Label>会员等级</Label>
                    <Select
                      value={memberLevel}
                      onValueChange={(v) => setMemberLevel(v as MembershipLevel)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="plus">Plus 会员</SelectItem>
                        <SelectItem value="ultra">Ultra 会员</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="member-days">
                    {memberAction === 'set' ? '有效期（天）' : '延长天数'}
                  </Label>
                  <Input
                    id="member-days"
                    type="number"
                    min={1}
                    value={memberDays}
                    onChange={(e) => setMemberDays(Math.max(1, parseInt(e.target.value) || 1))}
                  />
                  <p className="text-xs text-muted-foreground">
                    {memberAction === 'set'
                      ? `设置后会员将于 ${format(addDays(new Date(), memberDays), 'yyyy-MM-dd')} 到期`
                      : `延长后到期时间将在原有基础上增加 ${memberDays} 天`}
                  </p>
                </div>
              </>
            )}

            {memberAction === 'cancel' && (
              <div className="p-4 rounded-lg bg-destructive/5 border border-destructive/20 text-sm text-destructive">
                取消会员后，该用户将立即失去会员权益，已保存的作品不受影响。
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUserToMember(null)}>取消</Button>
            <Button
              className="bg-gradient-to-r from-primary to-amber-500 text-primary-foreground hover:from-primary/90 hover:to-amber-500/90"
              onClick={handleMemberSubmit}
              disabled={memberSubmitting}
            >
              {memberSubmitting ? '提交中...' : '确认'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 生成兑换码 */}
      <Dialog open={genDialogOpen} onOpenChange={(o) => !o && setGenDialogOpen(false)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>生成兑换码</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="gen-count">生成数量</Label>
              <Input
                id="gen-count"
                type="number"
                min={1}
                max={100}
                value={genCount}
                onChange={(e) => setGenCount(Math.min(100, Math.max(1, parseInt(e.target.value) || 1)))}
              />
              <p className="text-xs text-muted-foreground">一次最多生成 100 个</p>
            </div>
            <div className="space-y-2">
              <Label>会员等级</Label>
              <Select value={genLevel} onValueChange={(v) => setGenLevel(v as MembershipLevel)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="plus">Plus 会员</SelectItem>
                  <SelectItem value="ultra">Ultra 会员</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="gen-days">有效期（天）</Label>
              <Input
                id="gen-days"
                type="number"
                min={1}
                value={genDays}
                onChange={(e) => setGenDays(Math.max(1, parseInt(e.target.value) || 1))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGenDialogOpen(false)}>取消</Button>
            <Button
              className="bg-gradient-to-r from-primary to-amber-500 text-primary-foreground hover:from-primary/90 hover:to-amber-500/90"
              onClick={handleGenerateCodes}
              disabled={genSubmitting}
            >
              {genSubmitting ? '生成中...' : '生成'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 生成改密 CDK */}
      <Dialog open={genResetDialogOpen} onOpenChange={(o) => !o && setGenResetDialogOpen(false)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>生成改密 CDK</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="gen-reset-count">生成数量</Label>
              <Input
                id="gen-reset-count"
                type="number"
                min={1}
                max={100}
                value={genResetCount}
                onChange={(e) =>
                  setGenResetCount(Math.min(100, Math.max(1, parseInt(e.target.value) || 1)))
                }
              />
              <p className="text-xs text-muted-foreground">一次最多生成 100 个，每个 CDK 仅可使用一次</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="gen-reset-prefix">前缀（可选）</Label>
              <Input
                id="gen-reset-prefix"
                value={genResetPrefix}
                onChange={(e) => setGenResetPrefix(e.target.value)}
                placeholder="例如：PWD（留空则无前缀）"
                autoComplete="off"
              />
              <p className="text-xs text-muted-foreground">用于区分 CDK 用途，会自动转为大写</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGenResetDialogOpen(false)}>取消</Button>
            <Button
              className="bg-gradient-to-r from-primary to-amber-500 text-primary-foreground hover:from-primary/90 hover:to-amber-500/90"
              onClick={handleGenerateResetCodes}
              disabled={genResetSubmitting}
            >
              {genResetSubmitting ? '生成中...' : '生成'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
