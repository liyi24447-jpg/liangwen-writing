import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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

const registerSchema = z
  .object({
    account: z
      .string()
      .min(1, '请输入账号')
      .min(3, '账号长度至少 3 位')
      .max(32, '账号长度不超过 32 位')
      .regex(/^[a-zA-Z0-9_-]+$/, '账号只能包含字母、数字、下划线和短横线'),
    password: z.string().min(1, '请输入密码').min(6, '密码长度至少 6 位'),
    confirmPassword: z.string().min(1, '请确认密码'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: '两次输入的密码不一致',
    path: ['confirmPassword'],
  });

type RegisterFormData = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const navigate = useNavigate();
  const { register: registerFn, isLoggedIn } = useAuth();

  useEffect(() => {
    if (isLoggedIn) {
      navigate('/', { replace: true });
    }
  }, [isLoggedIn, navigate]);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: { account: '', password: '', confirmPassword: '' },
  });

  const onSubmit = async (values: RegisterFormData) => {
    setIsSubmitting(true);
    try {
      const result = await registerFn(values.account.trim(), values.password);
      if (result.success) {
        toast.success('注册成功，已自动登录');
        logger.info('[register] 注册成功:', values.account);
        setTimeout(() => navigate('/', { replace: true }), 400);
      } else {
        toast.error(result.message);
        if (result.message.includes('已存在') || result.message.includes('已注册')) {
          form.setError('account', { type: 'manual', message: result.message });
        } else {
          form.setError('account', { type: 'manual', message: result.message });
        }
      }
    } catch (error) {
      logger.error('[register] 注册失败:', String(error));
      toast.error('注册失败，请稍后重试');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout title="注册新账号" subtitle="创建账号 · 开启你的 AI 创作之旅">
      <div className="bg-card/80 backdrop-blur-xl rounded-2xl border border-border/60 shadow-xl shadow-primary/5 p-7">
        {/* 移动端标题 */}
        <h2 className="lg:hidden text-xl font-semibold text-foreground mb-6">注册新账号</h2>

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
                      placeholder="3-32 位，支持字母/数字/下划线/短横线"
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
                        placeholder="至少 6 位"
                        autoComplete="new-password"
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

            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    确认密码 <span aria-hidden="true" className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        type={showConfirmPassword ? 'text' : 'password'}
                        placeholder="请再次输入密码"
                        autoComplete="new-password"
                        {...field}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        aria-label={showConfirmPassword ? '隐藏密码' : '显示密码'}
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="size-4" />
                        ) : (
                          <Eye className="size-4" />
                        )}
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
              {isSubmitting ? '注册中...' : '注 册'}
            </Button>
          </form>
        </Form>

        <div className="mt-6 text-center text-sm text-muted-foreground">
          已有账号？{' '}
          <Link
            to="/login"
            className="text-primary font-medium hover:text-primary/80 transition-colors"
          >
            去登录
          </Link>
        </div>
      </div>
      <Toaster richColors position="top-center" />
    </AuthLayout>
  );
}
