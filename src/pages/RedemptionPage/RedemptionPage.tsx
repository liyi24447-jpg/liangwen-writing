import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Gift, Crown, Sparkles, ArrowRight, CheckCircle2, QrCode } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/lib/auth-context';
import { apiRedeemCode, type MembershipLevel } from '@/lib/api-client';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function RedemptionPage() {
  const navigate = useNavigate();
  const { isLoggedIn, isMember, membershipLevel, membershipExpireAt, updateMembership } = useAuth();
  const [code, setCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<{ level: MembershipLevel; expireAt: number } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || submitting) return;

    setSubmitting(true);
    try {
      const res = await apiRedeemCode(code.trim().toUpperCase());
      if (res.success && res.data) {
        setSuccess({
          level: res.data.membershipLevel,
          expireAt: res.data.membershipExpireAt,
        });
        updateMembership(res.data.membershipLevel, res.data.membershipExpireAt);
        toast.success('兑换成功！');
      } else {
        toast.error(res.message || '兑换失败');
      }
    } catch (err) {
      toast.error('兑换失败，请稍后重试');
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (ts: number) => {
    try {
      return format(ts, 'yyyy-MM-dd');
    } catch {
      return '—';
    }
  };

  const levelLabel = (level: MembershipLevel) =>
    level === 'ultra' ? 'Ultra 会员' : level === 'plus' ? 'Plus 会员' : '普通用户';

  const levelColor = (level: MembershipLevel) =>
    level === 'ultra' ? 'text-purple-500' : level === 'plus' ? 'text-primary' : 'text-muted-foreground';

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 md:px-6 py-16 md:py-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/15 border border-primary/30 text-primary text-sm font-medium mb-6">
            <Gift className="size-4" />
            兑换中心
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            使用兑换码开通会员
          </h1>
          <p className="text-muted-foreground max-w-xl mx-auto">
            输入你的专属兑换码，即可解锁对应等级的会员权益，畅享全部创作功能。
          </p>
        </motion.div>

        {/* 当前会员状态 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="mb-8"
        >
          <Card className="border-border/50 bg-card/60 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Crown className="size-5 text-primary" />
                当前会员状态
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <div className={`text-2xl font-bold ${levelColor(membershipLevel)}`}>
                    {isLoggedIn ? levelLabel(membershipLevel) : '—'}
                  </div>
                  {isMember && membershipExpireAt > 0 && (
                    <div className="text-sm text-muted-foreground mt-1">
                      到期时间：{formatDate(membershipExpireAt)}
                    </div>
                  )}
                  {!isMember && isLoggedIn && (
                    <div className="text-sm text-muted-foreground mt-1">
                      暂未开通会员，使用兑换码立即解锁
                    </div>
                  )}
                </div>
                <Button
                  variant="outline"
                  className="border-primary/30 text-primary hover:bg-primary/10"
                  onClick={() => navigate('/library')}
                >
                  前往藏书阁
                  <ArrowRight className="size-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* 兑换表单 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <Card className="border-border/50 bg-card/60 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="size-5 text-primary" />
                输入兑换码
              </CardTitle>
            </CardHeader>
            <CardContent>
              {success ? (
                <div className="text-center py-8">
                  <div className="size-16 mx-auto mb-4 rounded-full bg-success/10 flex items-center justify-center">
                    <CheckCircle2 className="size-8 text-success" />
                  </div>
                  <h3 className="text-xl font-bold text-foreground mb-2">兑换成功</h3>
                  <p className="text-muted-foreground mb-6">
                    恭喜你获得 <span className={`font-semibold ${levelColor(success.level)}`}>{levelLabel(success.level)}</span>，
                    有效期至 {formatDate(success.expireAt)}
                  </p>
                  <div className="flex gap-3 justify-center">
                    <Button
                      className="bg-gradient-to-r from-primary to-amber-500 text-primary-foreground hover:from-primary/90 hover:to-amber-500/90"
                      onClick={() => navigate('/write')}
                    >
                      立即去创作
                      <ArrowRight className="size-4 ml-2" />
                    </Button>
                    <Button variant="outline" onClick={() => { setSuccess(null); setCode(''); }}>
                      继续兑换
                    </Button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Input
                      type="text"
                      value={code}
                      onChange={(e) => setCode(e.target.value.toUpperCase())}
                      placeholder="请输入兑换码，如 ABCD-EFGH-IJKL"
                      className="h-14 text-lg tracking-wider font-mono"
                      maxLength={30}
                    />
                  </div>
                  <Button
                    type="submit"
                    size="lg"
                    disabled={!code.trim() || submitting}
                    className="w-full h-12 bg-gradient-to-r from-primary to-amber-500 text-primary-foreground hover:from-primary/90 hover:to-amber-500/90 shadow-md shadow-primary/20"
                  >
                    {submitting ? '兑换中...' : '立即兑换'}
                    {!submitting && <ArrowRight className="size-4 ml-2" />}
                  </Button>
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-primary/5 border border-primary/20">
                    <QrCode className="size-4 text-primary shrink-0 mt-0.5" />
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      关注微信公众号 <span className="font-semibold text-foreground">《靓文写作》</span> 免费获取兑换码，
                      第一时间收到更新通知与创作灵感推送。
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground text-center">
                    兑换码区分大小写？不区分，系统自动转为大写
                  </p>
                </form>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* 会员权益说明 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mt-10 grid md:grid-cols-2 gap-6"
        >
          <Card className="border-border/50 bg-card/60 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Crown className="size-5 text-primary" />
                Plus 会员
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="size-4 text-primary shrink-0 mt-0.5" />
                <span>网文扫榜（热门榜单实时追踪）</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="size-4 text-primary shrink-0 mt-0.5" />
                <span>拆书分析（一键拆解热门作品结构）</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="size-4 text-primary shrink-0 mt-0.5" />
                <span>去AI味润色（正文智能改写优化）</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="size-4 text-primary shrink-0 mt-0.5" />
                <span>书案工作台（章节化管理，不限章节数）</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="size-4 text-primary shrink-0 mt-0.5" />
                <span>藏书阁最多保存 2 部作品</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="size-4 text-primary shrink-0 mt-0.5" />
                <span>每日生成正文最多 10 万字</span>
              </div>
              <div className="flex items-start gap-2 text-muted-foreground">
                <span className="size-4 shrink-0 mt-0.5 inline-flex items-center justify-center">
                  <span className="size-2.5 rounded-sm border-2 border-muted-foreground/40" />
                </span>
                <span>不含：短篇创作、上传续写（Ultra 专享）</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-purple-300/50 bg-gradient-to-br from-purple-50/50 to-card/60 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg text-purple-600">
                <Crown className="size-5" />
                Ultra 会员
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="size-4 text-purple-500 shrink-0 mt-0.5" />
                <span>全部 Plus 权益</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="size-4 text-purple-500 shrink-0 mt-0.5" />
                <span>短篇创作（AI 流式生成小说正文）</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="size-4 text-purple-500 shrink-0 mt-0.5" />
                <span>上传续写（导入作品后 AI 继续创作）</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="size-4 text-purple-500 shrink-0 mt-0.5" />
                <span>藏书阁作品数量不限</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="size-4 text-purple-500 shrink-0 mt-0.5" />
                <span>每日生成字数无上限</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="size-4 text-purple-500 shrink-0 mt-0.5" />
                <span>优先客服支持与功能更新</span>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
