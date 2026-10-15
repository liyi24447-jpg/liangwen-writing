import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Toaster } from '@/components/ui/sonner';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import AuthLayout from '@/components/AuthLayout';
import { useAuth } from '@/lib/auth-context';
import { toast } from 'sonner';
import { logger } from '@lark-apaas/client-toolkit-lite';

const loginSchema = z.object({
  account: z.string().min(1, '请输入账号').min(3, '账号长度至少 3 位'),
  password: z.string().min(1, '请输入密码').min(6, '密码长度至少 6 位'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isLoggedIn } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const from = (location.state as { from?: string } | null)?.from || '/';

  // 已登录用户访问登录页，直接跳转
  useEffect(() => {
    if (isLoggedIn) {
      navigate(from, { replace: true });
    }
  }, [isLoggedIn, navigate, from]);

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { account: '', password: '' },
  });

  const onSubmit = async (values: LoginFormData) => {
    setIsSubmitting(true);
    try {
      const result = await login(values.account.trim(), values.password);
      if (result.success) {
        toast.success('登录成功，欢迎回来');
        logger.info('[login] 登录成功，跳转:', from);
        setTimeout(() => navigate(from, { replace: true }), 300);
      } else {
        toast.error(result.message);
        if (result.message.includes('不存在')) {
          form.setError('account', { type: 'manual', message: result.message });
        } else if (result.message.includes('密码错误')) {
          form.setError('password', { type: 'manual', message: result.message });
        } else {
          form.setError('account', { type: 'manual', message: result.message });
        }
      }
    } catch (error) {
      logger.error('[login] 登录失败:', String(error));
      toast.error('登录失败，请稍后重试');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout title="登录账号" subtitle="登录后开启你的 AI 创作之旅">
      <div className="bg-card/80 backdrop-blur-xl rounded-2xl border border-border/60 shadow-xl shadow-primary/5 p-7">
        {/* 移动端标题 */}
        <h2 className="lg:hidden text-xl font-semibold text-foreground mb-6">登录账号</h2>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <FormField
              control={form.control}
              name="account"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    账号 <span aria-hidden="true" className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="请输入账号"
                      autoComplete="username"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    密码 <span aria-hidden="true" className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="请输入密码"
                        autoComplete="current-password"
                        {...field}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        aria-label={showPassword ? '隐藏密码' : '显示密码'}
                      >
                        {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                      </button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button
              type="submit"
              className="w-full h-11 bg-gradient-to-r from-primary to-amber-500 text-primary-foreground hover:from-primary/90 hover:to-amber-500/90 shadow-md shadow-primary/20"
              disabled={isSubmitting}
            >
              {isSubmitting ? '登录中...' : '登 录'}
            </Button>
          </form>
        </Form>

        <div className="mt-6 text-center text-sm text-muted-foreground">
          还没有账号？{' '}
          <Link
            to="/register"
            className="text-primary font-medium hover:text-primary/80 transition-colors"
          >
            立即注册
          </Link>
        </div>
      </div>
      <Toaster richColors position="top-center" />
    </AuthLayout>
  );
}
