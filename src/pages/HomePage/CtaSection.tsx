import { motion } from 'framer-motion';
import { PenTool, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth-context';

export default function CtaSection() {
  const navigate = useNavigate();
  const { isLoggedIn } = useAuth();

  const handleStart = () => {
    navigate(isLoggedIn ? '/library' : '/write');
  };

  return (
    <section className="w-full py-20 md:py-28">
      <div className="max-w-7xl mx-auto px-4 md:px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
          className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-emerald-500 to-teal-500 p-10 md:p-16 text-center"
        >
          {/* 装饰光效 */}
          <div className="absolute top-0 right-0 w-80 h-80 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
          
          {/* 网格背景 */}
          <div className="absolute inset-0 opacity-[0.06] pointer-events-none" style={{
            backgroundImage: 'linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)',
            backgroundSize: '32px 32px',
          }} />

          <div className="relative z-10 max-w-2xl mx-auto">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-primary-foreground mb-4 leading-tight">
              AI 赋能创作，下笔如有神
            </h2>
            <p className="text-lg text-primary-foreground/80 mb-8 leading-relaxed">
              现在就开始你的智能写作之旅，让 AI 成为你最强的创作搭档。
            </p>
            <Button
              size="lg"
              variant="secondary"
              className="bg-primary-foreground text-primary hover:bg-primary-foreground/90 h-12 px-8 text-base font-semibold shadow-lg"
               onClick={handleStart}
            >
              <PenTool className="size-5 mr-2" />
              立即开始创作
              <ArrowRight className="size-4 ml-2" />
            </Button>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
