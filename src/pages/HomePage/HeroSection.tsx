import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { PenTool, Sparkles, ArrowRight, BookOpen, TrendingUp, Wand2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Image } from '@/components/ui/image';
import { useAuth } from '@/lib/auth-context';

const HERO_IMAGE =
  '/spark/app/app_17fz9k7kgja/runtime/api/v1/storage/object/bucket_aadkzykd7cqmu_static/static%2Faadkzyim5yedw_ve_miaoda';

export default function HeroSection() {
  const navigate = useNavigate();
  const { isLoggedIn } = useAuth();

  const handleStartCreating = () => {
    navigate(isLoggedIn ? '/library' : '/write');
  };

  const quickEntries = [
    { icon: PenTool, label: '短篇创作', path: '/write', desc: '一键生成' },
    { icon: BookOpen, label: '拆书分析', path: '/disassemble', desc: '深度拆解' },
    { icon: TrendingUp, label: '网文扫榜', path: '/hot-rank', desc: '热门洞察' },
    { icon: Wand2, label: '去 AI 味', path: '/optimize', desc: '润色优化' },
  ];

  return (
    <section className="relative w-full overflow-hidden bg-background">
      {/* 背景图 */}
      <div className="absolute inset-0 z-0">
        <Image
          src={HERO_IMAGE}
          alt="AI 智能写作未来科技感"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/80 to-background" />
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/60 to-transparent" />
      </div>

      {/* 光效装饰 */}
      <div className="absolute top-20 right-[15%] w-96 h-96 bg-primary/15 rounded-full blur-3xl pointer-events-none z-10" />
      <div className="absolute bottom-20 left-[10%] w-72 h-72 bg-emerald-400/10 rounded-full blur-3xl pointer-events-none z-10" />

      {/* 网格装饰 */}
      <div className="absolute inset-0 z-0 opacity-[0.03] pointer-events-none" style={{
        backgroundImage: 'linear-gradient(currentColor 1px, transparent 1px), linear-gradient(90deg, currentColor 1px, transparent 1px)',
        backgroundSize: '40px 40px',
      }} />

      <div className="relative z-20 max-w-7xl mx-auto px-4 md:px-6 py-24 md:py-32 lg:py-40">
        <div className="max-w-3xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/15 border border-primary/30 text-primary text-sm font-medium mb-6"
          >
            <Sparkles className="size-4" />
            AI 智能写作 · 四大核心能力
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1, ease: 'easeOut' }}
            className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground leading-tight tracking-tight mb-6"
          >
            靓文写作
            <br />
            <span className="bg-gradient-to-r from-primary via-emerald-500 to-teal-400 bg-clip-text text-transparent">
              AI 赋能，下笔有神
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.25, ease: 'easeOut' }}
            className="text-lg md:text-xl text-muted-foreground leading-relaxed mb-8 max-w-2xl"
          >
            智能生成、拆书学习、榜单洞察、去 AI 味润色——
            一站式 AI 写作解决方案，让你的文字既有创意又有温度。
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4, ease: 'easeOut' }}
            className="flex flex-wrap gap-4 mb-12"
          >
             <Button
               size="lg"
               className="bg-gradient-to-r from-primary to-emerald-500 text-primary-foreground hover:from-primary/90 hover:to-emerald-500/90 shadow-md shadow-primary/20 px-8 h-12 text-base"
               onClick={handleStartCreating}
             >
              <PenTool className="size-5 mr-2" />
              立即创作
              <ArrowRight className="size-4 ml-2" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-primary/40 text-foreground hover:bg-primary/10 hover:text-primary h-12 text-base px-8"
              onClick={() => navigate('/disassemble')}
            >
              <BookOpen className="size-4 mr-2" />
              试试拆书
            </Button>
          </motion.div>

          {/* 功能快速入口 */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.55, ease: 'easeOut' }}
            className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-2xl"
          >
            {quickEntries.map((item, i) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.label}
                  onClick={() => navigate(item.path)}
                  className="group p-4 rounded-xl border transition-all text-left bg-card/50 backdrop-blur-sm border-border/50 hover:border-primary/40 hover:bg-card/80 cursor-pointer"
                >
                  <Icon className="size-5 mb-2 text-primary" />
                  <div className="text-sm font-medium mb-0.5 text-foreground group-hover:text-primary transition-colors">
                    {item.label}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {item.desc}
                  </div>
                </button>
              );
            })}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
