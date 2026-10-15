import { useState, useRef } from 'react';
import { Download, Upload, Cloud, Shield, AlertTriangle, Check, X, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/lib/auth-context';
import { apiExportUserData, apiImportUserData, type ExportResult } from '@/lib/api-client';
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-background py-10">
      <div className="max-w-3xl mx-auto px-4 md:px-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">账号设置</h1>
          <p className="text-sm text-muted-foreground mt-1">管理你的账号数据与跨设备同步</p>
        </div>

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

        {/* 跨设备同步方案 */}
        <Card className="border-amber-400/40 bg-amber-50/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-lg text-amber-700 flex items-center gap-2">
              <Cloud className="size-5" />
              关于跨设备数据同步
            </CardTitle>
            <CardDescription className="text-amber-700/70">
              当前数据存储在你的浏览器本地，下面是可行的跨设备同步方案
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-amber-800/80">
            <div className="space-y-2">
              <p className="font-medium text-amber-800 flex items-center gap-2">
                <Info className="size-4" />
                当前模式说明
              </p>
              <p>
                本应用当前运行在前端预览模式，你的账号、作品、会员等所有数据都存储在浏览器本地（IndexedDB），
                <strong>数据不会上传到云端，也无法自动跨设备同步</strong>。
              </p>
            </div>

            <div className="space-y-2">
              <p className="font-medium text-amber-800">方案一：数据导出/导入迁移（已启用）</p>
              <p>
                使用上方的「导出数据」和「导入数据」功能，可以在不同设备之间手动迁移你的作品数据。
                步骤：
              </p>
              <ol className="list-decimal list-inside space-y-1 pl-2">
                <li>在设备 A 注册账号并使用，点击「导出全部数据」下载 JSON 文件</li>
                <li>在设备 B 注册同一账号（或已有账号登录）</li>
                <li>在设备 B 点击「导入数据」，选择设备 A 导出的 JSON 文件</li>
                <li>导入完成后，设备 B 就有了设备 A 的所有作品</li>
              </ol>
              <p className="pt-1">
                <strong>注意：</strong>账号密码需要你自己在两台设备分别注册（建议用相同的账号名便于记忆），
                导出文件只包含作品数据，不包含密码。
              </p>
            </div>

            <div className="space-y-2">
              <p className="font-medium text-amber-800 flex items-center gap-2">
                <Shield className="size-4" />
                方案二：部署全栈版本（推荐长期使用）
              </p>
              <p>
                本应用已内置完整的 Express + SQLite 全栈后端（<code className="bg-amber-100 px-1.5 py-0.5 rounded">server/</code> 目录），
                支持账号系统、作品云端存储、会员体系、兑换码、公告、管理后台等全部功能。
              </p>
              <p>如果你有 Node.js 服务器，可按以下步骤部署全栈版本，实现真正的云端跨设备同步：</p>
              <pre className="bg-amber-100/60 p-3 rounded-lg text-xs overflow-x-auto">
{`# 1. 将项目部署到支持 Node.js 的服务器
# 2. 安装依赖
npm install

# 3. 构建前端
npm run build

# 4. 启动后端服务（监听 3001 端口）
node server/index.js

# 5. 配置反向代理（Nginx 示例）：
#    /api -> http://localhost:3001/api
#    /    -> 前端静态文件（dist/ 目录）

# 6. 数据库文件默认在 data/app.db，定期备份即可`}
              </pre>
              <p>
                部署全栈版本后，前端会自动检测后端可用性并切换到真实 API 模式，
                所有账号、作品、会员数据都会存储在服务器的 SQLite 数据库中，实现真正的跨设备同步。
              </p>
            </div>

            <div className="space-y-2">
              <p className="font-medium text-amber-800 flex items-center gap-2">
                <AlertTriangle className="size-4" />
                数据安全提示
              </p>
              <ul className="list-disc list-inside space-y-1 pl-2">
                <li>导出文件包含你的作品全文，请妥善保管，不要分享给他人</li>
                <li>浏览器清理缓存或卸载浏览器会导致本地数据丢失，建议定期导出备份</li>
                <li>全栈部署后，请定期备份 <code className="bg-amber-100 px-1 py-0.5 rounded">data/app.db</code> 文件</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
