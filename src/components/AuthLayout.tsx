import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import {
  PenTool,
  Sparkles,
  BookOpen,
  TrendingUp,
  Wand2,
  Zap,
  FileText,
} from 'lucide-react';

interface AuthLayoutProps {
  children: ReactNode;
  title: string;
  subtitle: string;
}

const features = [
  {
    icon: Sparkles,
    title: '短篇创作',
    desc: 'AI 一键生成短篇小说，灵感枯竭也能快速产出',
  },
  {
    icon: BookOpen,
    title: '拆书分析',
    desc: '快速拆解热门网文结构，学习爆款写作套路',
  },
  {
    icon: TrendingUp,
    title: '网文扫榜',
    desc: '实时追踪各大榜单动态，把握市场风向',
  },
  {
    icon: Wand2,
    title: '去AI味润色',
    desc: '一键消除 AI 痕迹，让文字更自然有温度',
  },
  {
    icon: Zap,
    title: '一键成书',
    desc: '输入题材、设定、人物，AI 即刻生成精彩小说内容，支持章节定制、字数控制，创作从未如此高效',
  },
  {
    icon: FileText,
    title: '支持续写',
    desc: '上传或粘贴已有小说内容，AI 将自动分析章节结构、文风与人物设定，创建可续写的作品',
  },
];

export default function AuthLayout({ children, title, subtitle }: AuthLayoutProps) {
  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-primary/5 via-background to-secondary/10 flex items-stretch">
      {/* 左侧品牌介绍区 */}
      <div className="hidden lg:flex flex-1 flex-col justify-between p-12 xl:p-16 relative overflow-hidden">
        {/* 背景装饰 */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-20 left-20 w-72 h-72 bg-primary/10 rounded-full blur-3xl" />
          <div className="absolute bottom-32 right-20 w-96 h-96 bg-amber-400/10 rounded-full blur-3xl" />
        </div>

        <div className="relative z-10">
          <Link to="/" className="inline-flex items-center gap-3 mb-16">
            <div className="size-12 rounded-xl bg-gradient-to-br from-primary to-amber-500 flex items-center justify-center text-primary-foreground shadow-lg shadow-primary/30">
              <PenTool className="size-6" />
            </div>
            <div>
              <div className="text-2xl font-bold text-foreground tracking-wide">
                靓文写作
              </div>
            </div>
          </Link>

          <div className="max-w-lg space-y-4">
            <h1 className="text-5xl xl:text-6xl font-bold text-foreground tracking-tight leading-tight">
              AI 赋能
              <br />
              <span className="bg-gradient-to-r from-primary to-amber-500 bg-clip-text text-transparent">
                下笔有神
              </span>
            </h1>
            <p className="text-lg text-muted-foreground leading-relaxed">
              智能生成 · 拆书学习 · 榜单洞察 · 去 AI 味润色 · 一键成书 · 支持续写
              <br />
              一站式 AI 写作解决方案，让创作更高效。
            </p>
          </div>
        </div>

        {/* 六大核心能力 */}
        <div className="relative z-10 grid grid-cols-2 md:grid-cols-3 gap-4 max-w-2xl">
          {features.map((f) => {
            const Icon = f.icon;
            return (
              <div
                key={f.title}
                className="bg-card/60 backdrop-blur-sm rounded-xl border border-border/40 p-5 shadow-sm"
              >
                <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                  <Icon className="size-5 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground mb-1">
                  {f.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {f.desc}
                </p>
              </div>
            );
          })}
        </div>

        <div className="relative z-10 text-sm text-muted-foreground">
          © 2025 靓文写作 · 让 AI 成为你的创作伙伴
        </div>
      </div>

      {/* 右侧表单区 */}
      <div className="flex-1 flex items-center justify-center p-6 md:p-10 lg:w-[32rem] lg:flex-none lg:bg-card/30 lg:backdrop-blur-lg lg:border-l lg:border-border/50">
        <div className="w-full max-w-md">
          {/* 移动端品牌展示 */}
          <div className="lg:hidden text-center mb-8">
            <Link to="/" className="inline-flex items-center gap-2 mb-4">
              <div className="size-11 rounded-xl bg-gradient-to-br from-primary to-amber-500 flex items-center justify-center text-primary-foreground shadow-lg shadow-primary/30">
                <PenTool className="size-5" />
              </div>
            </Link>
            <h1 className="text-2xl font-bold text-foreground">靓文写作</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {subtitle}
            </p>
             <p className="text-sm text-muted-foreground mt-3 max-w-sm mx-auto leading-relaxed">
               智能生成 · 拆书学习 · 榜单洞察 · 去AI味润色 · 一键成书 · 支持续写
               <br />
               一站式 AI 写作解决方案
             </p>
            <div className="flex flex-wrap justify-center gap-2 mt-4">
              {features.map((f) => {
                const Icon = f.icon;
                return (
                  <div
                    key={f.title}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-card/60 border border-border/50 text-xs text-muted-foreground"
                  >
                    <Icon className="size-3.5 text-primary" />
                    {f.title}
                  </div>
                );
              })}
            </div>
          </div>

          {/* 桌面端标题 */}
          <div className="hidden lg:block mb-8">
            <h2 className="text-2xl font-bold text-foreground">{title}</h2>
            <p className="text-muted-foreground mt-2 text-sm">{subtitle}</p>
          </div>

          {children}

          <p className="text-center text-xs text-muted-foreground mt-6">
            登录即表示同意《用户协议》和《隐私政策》
          </p>
        </div>
      </div>
    </div>
  );
}
