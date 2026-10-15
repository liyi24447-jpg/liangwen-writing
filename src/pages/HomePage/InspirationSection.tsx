import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, BookOpen, TrendingUp, Sparkles } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

const QUICK_ENTRIES = [
  {
    icon: BookOpen,
    title: '拆书学习',
    desc: '上传优秀作品，AI 拆解创作门道',
    path: '/disassemble',
    gradient: 'from-primary/20 to-emerald-500/5',
  },
  {
    icon: TrendingUp,
    title: '网文扫榜',
    desc: '六大平台热榜，实时掌握创作趋势',
    path: '/hot-rank',
    gradient: 'from-teal-500/20 to-cyan-500/5',
  },
  {
    icon: Sparkles,
    title: '去 AI 味',
    desc: '一键优化润色，让文字更像人写的',
    path: '/optimize',
    gradient: 'from-amber-400/20 to-yellow-500/5',
  },
];

export default function InspirationSection() {
  const navigate = useNavigate();

  return (
    <section className="w-full py-20 md:py-28">
      <div className="max-w-7xl mx-auto px-4 md:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <span className="inline-block px-4 py-1 rounded-full bg-primary/15 text-primary text-sm font-medium mb-4">
            更多工具
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            全方位写作辅助
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            不止是生成器，更是你的全能写作搭档——拆书学习、榜单洞察、润色优化，一站式搞定。
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {QUICK_ENTRIES.map((item, index) => {
            const Icon = item.icon;
            return (
              <motion.button
                key={item.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-80px' }}
                transition={{ duration: 0.5, delay: index * 0.1, ease: 'easeOut' }}
                whileHover={{ y: -6, transition: { duration: 0.2 } }}
                onClick={() => navigate(item.path)}
                className="group text-left w-full cursor-pointer"
              >
                <Card className="h-full overflow-hidden transition-all border-border/50 bg-card/50 group-hover:border-primary/40">
                  <CardContent className="p-6 space-y-4">
                    <div className={`size-14 rounded-xl bg-gradient-to-br ${item.gradient} flex items-center justify-center`}>
                      <Icon className="size-7 text-primary" />
                    </div>
                    <div className="flex items-center justify-between">
                      <h3 className="text-xl font-semibold text-foreground">
                        {item.title}
                      </h3>
                      <ArrowRight className="size-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                    </div>
                    <p className="text-muted-foreground leading-relaxed">
                      {item.desc}
                    </p>
                  </CardContent>
                </Card>
              </motion.button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
