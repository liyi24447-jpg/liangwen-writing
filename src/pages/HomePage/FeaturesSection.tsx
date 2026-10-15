import { motion } from 'framer-motion';
import { Wand2, BookOpen, TrendingUp, Sparkles } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

const FEATURES = [
  {
    icon: Wand2,
    title: 'AI 智能创作',
    description: '输入题材、设定、人物，AI 即刻生成精彩小说内容，支持章节定制、字数控制，创作从未如此高效。',
  },
  {
    icon: BookOpen,
    title: '深度拆书分析',
    description: '上传任意作品，AI 自动拆解书名、简介、开篇手法、文风特征和创作提示，把好作品的门道学到手。',
  },
  {
    icon: TrendingUp,
    title: '全网扫榜洞察',
    description: '聚合起点、晋江、番茄等六大网文平台热销榜单，实时掌握热门题材与创作趋势，把握流量密码。',
  },
  {
    icon: Sparkles,
    title: '去 AI 味润色',
    description: 'AI 生成的内容太假？一键去 AI 味优化，让文字回归自然真实的人类写作质感，阅读体验飙升。',
  },
];

export default function FeaturesSection() {
  return (
    <section className="w-full py-20 md:py-28 bg-gradient-to-b from-background via-primary/5 to-background">
      <div className="max-w-7xl mx-auto px-4 md:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="inline-block px-4 py-1 rounded-full bg-primary/15 text-primary text-sm font-medium mb-4">
            核心功能
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            四大核心能力，助力创作升级
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            从灵感到完稿，从学习到优化，靓文写作全程 AI 赋能，
            让每一位创作者都能高效产出优质内容。
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {FEATURES.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-80px' }}
                transition={{ duration: 0.5, delay: index * 0.1, ease: 'easeOut' }}
                whileHover={{ y: -4, transition: { duration: 0.2 } }}
              >
                <Card className="h-full border-primary/15 bg-card/50 backdrop-blur-sm hover:border-primary/40 transition-colors">
                  <CardContent className="p-8 space-y-4">
                    <div className="size-14 rounded-xl bg-gradient-to-br from-primary/20 to-emerald-500/10 flex items-center justify-center">
                      <Icon className="size-7 text-primary" />
                    </div>
                    <h3 className="text-xl font-semibold text-foreground">
                      {feature.title}
                    </h3>
                    <p className="text-muted-foreground leading-relaxed">
                      {feature.description}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
