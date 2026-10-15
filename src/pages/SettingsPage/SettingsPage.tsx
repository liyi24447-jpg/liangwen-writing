import { useState, useRef } from 'react';
import { Download, Upload, KeyRound, Check, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/lib/auth-context';
import { apiExportUserData, apiImportUserData, apiChangePassword, type ExportResult } from '@/lib/api-client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';

export default function SettingsPage() {
  const { user, refreshMe } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importPreview, setImportPreview] = useState<ExportResult | null>(null);
  const [importFile, setImportFile] = useState<File | null>(null);

  // 修改密码
  const [pwdCdk, setPwdCdk] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwdSubmitting, setPwdSubmitting] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await apiExportUserData();
      if (res.success && res.data) {
        const jsonStr = JSON.stringify(res.data, null, 2);
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `liangwen-export-${res.data.account}-${format(Date.now(), 'yyyyMMdd-HHmmss')}.json`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success('数据导出成功');
      } else {
        toast.error(res.message || '导出失败');
      }
    } catch (err) {
      toast.error('导出异常，请刷新重试');
    } finally {
      setExporting(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportFile(file);
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result as string) as ExportResult;
        if (data.version !== 1 || !data.account || !Array.isArray(data.books)) {
          toast.error('文件格式无效，请确认是本应用导出的文件');
          setImportPreview(null);
          return;
        }
        setImportPreview(data);
      } catch {
        toast.error('文件解析失败，请确认是 JSON 格式的导出文件');
        setImportPreview(null);
      }
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (!importPreview) return;
    if (!user) {
      toast.error('请先登录');
      return;
    }
    if (importPreview.account !== user.account) {
      const confirmed = window.confirm(
        `导出文件属于账号「${importPreview.account}」，当前登录账号是「${user.account}」。\n\n仍然导入到当前账号吗？（作品数据会合并进当前账号）`
      );
      if (!confirmed) return;
    } else {
      const confirmed = window.confirm(
        '确认将导出的作品数据导入到当前账号吗？\n\n相同 ID 的作品会被跳过，不会覆盖已有数据。'
      );
      if (!confirmed) return;
    }
    setImporting(true);
    try {
      const res = await apiImportUserData(importPreview);
      if (res.success && res.data) {
        toast.success(`导入完成：成功 ${res.data.importedBooks} 部，跳过 ${res.data.skippedBooks} 部`);
        setImportPreview(null);
        setImportFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
        // 刷新用户信息（如会员等可能因导入而更新的场景暂不处理）
        refreshMe?.();
        // 跳转到藏书阁查看
        setTimeout(() => {
          navigate('/library');
        }, 1500);
      } else {
        toast.error(res.message || '导入失败');
      }
    } catch (err) {
      toast.error('导入异常，请刷新重试');
    } finally {
      setImporting(false);
    }
  };

  const handleChangePassword = async () => {
    if (pwdSubmitting) return;
    if (!pwdCdk.trim()) {
      toast.error('请输入 CDK');
      return;
    }
    if (newPassword.length < 6) {
      toast.error('新密码长度至少 6 位');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('两次输入的新密码不一致');
      return;
    }
    setPwdSubmitting(true);
    try {
      const res = await apiChangePassword(pwdCdk.trim(), newPassword);
      if (res.success) {
        toast.success('密码修改成功，下次登录请使用新密码');
        setPwdCdk('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        toast.error(res.message || '密码修改失败');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '密码修改异常，请刷新重试');
    } finally {
      setPwdSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-background py-10">
      <div className="max-w-3xl mx-auto px-4 md:px-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">账号设置</h1>
          <p className="text-sm text-muted-foreground mt-1">管理你的账号安全、密码与数据</p>
        </div>

        {/* 修改密码 */}
        <Card className="border-primary/10 bg-card/60 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <KeyRound className="size-5 text-primary" />
              修改密码
            </CardTitle>
            <CardDescription>
              为保障账号安全，修改密码需要先获取 CDK（一次性验证码）
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-3.5 flex items-start gap-2.5 text-sm">
              <MessageCircle className="size-4 text-primary shrink-0 mt-0.5" />
              <p className="text-foreground/80">
                请先关注微信公众号<strong>《靓文写作》</strong>，在公众号内获取修改密码专用
                <strong> CDK</strong>，每个 CDK 仅可使用一次。
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="pwd-cdk">CDK（验证码）</Label>
              <Input
                id="pwd-cdk"
                value={pwdCdk}
                onChange={(e) => setPwdCdk(e.target.value)}
                placeholder="请输入公众号获取的 CDK"
                autoComplete="off"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="new-pwd">新密码</Label>
              <Input
                id="new-pwd"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="请输入新密码（至少 6 位）"
                autoComplete="new-password"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm-pwd">确认新密码</Label>
              <Input
                id="confirm-pwd"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="请再次输入新密码"
                autoComplete="new-password"
              />
            </div>

            <Button
              onClick={handleChangePassword}
              disabled={pwdSubmitting || !pwdCdk.trim() || newPassword.length < 6 || confirmPassword.length < 6}
              className="w-full"
            >
              {pwdSubmitting ? '正在提交...' : '确认修改密码'}
            </Button>
          </CardContent>
        </Card>

        {/* 数据导出 */}
        <Card className="border-primary/10 bg-card/60 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Download className="size-5 text-primary" />
              导出数据
            </CardTitle>
            <CardDescription>
              将你的作品数据导出为 JSON 文件，可用于备份或迁移到其他设备
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              导出内容包含：账号信息、功能权限配置、藏书阁所有作品（含章节、人物、设定等完整数据）。
              <strong className="text-foreground">注意：导出文件不含登录密码。</strong>
            </p>
            <Button onClick={handleExport} disabled={exporting}>
              <Download className="size-4 mr-2" />
              {exporting ? '正在导出...' : '导出全部数据'}
            </Button>
          </CardContent>
        </Card>

        {/* 数据导入 */}
        <Card className="border-primary/10 bg-card/60 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Upload className="size-5 text-primary" />
              导入数据
            </CardTitle>
            <CardDescription>
              将之前导出的 JSON 文件导入到当前账号，实现跨设备数据迁移
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              选择本应用导出的 JSON 文件，系统会将文件中的作品导入到当前登录账号。
              相同 ID 的作品会被跳过（不会覆盖已有数据）。
            </p>

            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              onChange={handleFileSelect}
              className="hidden"
              id="import-file"
            />

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                <Upload className="size-4 mr-2" />
                选择文件
              </Button>
              {importFile && (
                <span className="text-sm text-muted-foreground self-center">
                  已选择：{importFile.name}
                </span>
              )}
            </div>

            {importPreview && (
              <div className="rounded-lg border border-border/60 bg-background/50 p-4 space-y-3">
                <div className="flex items-center gap-2 text-foreground font-medium">
                  <Check className="size-4 text-success" />
                  文件解析成功
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="text-muted-foreground">来源账号</div>
                  <div className="text-foreground font-medium">{importPreview.account}</div>
                  <div className="text-muted-foreground">导出时间</div>
                  <div className="text-foreground">
                    {format(importPreview.exportAt, 'yyyy-MM-dd HH:mm:ss')}
                  </div>
                  <div className="text-muted-foreground">作品数量</div>
                  <div className="text-foreground">{importPreview.books.length} 部</div>
                </div>
                <Button onClick={handleImport} disabled={importing} className="w-full mt-2">
                  {importing ? '正在导入...' : '确认导入到当前账号'}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
