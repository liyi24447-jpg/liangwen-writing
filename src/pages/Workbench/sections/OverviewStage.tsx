import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { BookOpen, PenTool, FileText, Sparkles } from 'lucide-react';
import type { IBookWork } from '@/data/novel';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

interface OverviewStageProps {
  book: IBookWork;
  onStart: () => void;
}

const STATS = [
  { label: '总章节', key: 'chapterCount', icon: BookOpen, unit: '章' },
  { label: '已完成', key: 'completedCount', icon: PenTool, unit: '章' },
  { label: '总字数', key: 'wordCount', icon: FileText, unit: '字' },
  { label: '字数额度', key: 'quota', icon: Sparkles, unit: '字' },
];

export default function OverviewStage({ book, onStart }: OverviewStageProps) {
  const completedChapters = book.chapters.filter((c) => c.status === 'completed').length;
  const stats = [
    { label: '总章节', value: book.chapterCount, icon: BookOpen, unit: '章' },
    { label: '已完成', value: completedChapters, icon: PenTool, unit: '章' },
    { label: '总字数', value: book.wordCount, icon: FileText, unit: '字' },
    { label: '字数额度', value: Math.max(book.wordCount, 10000), icon: Sparkles, unit: '字' },
  ];

  return (
    <div className="max-w-2xl mx-auto w-full">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Card className="border-primary/15 bg-card/80 backdrop-blur-sm shadow-xl shadow-primary/5">
          <CardContent className="p-8">
            <div className="text-center mb-8">
              <div className="size-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-primary/20 to-emerald-500/20 flex items-center justify-center">
                <BookOpen className="size-8 text-primary" />
              </div>
              <h2 className="text-xl font-bold text-foreground mb-2">书案工作台</h2>
              <p className="text-sm text-muted-foreground leading-relaxed max-w-md mx-auto">
                当前全书数据概况。创作风格在「内容管理」首阶段；拆书请使用主导航「拆书」，结果可保存至备忘录后在各阶段作为参考引入。
              </p>
            </div>

            {/* 创作统计 */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              {stats.map((stat, idx) => {
                const Icon = stat.icon;
                return (
                  <motion.div
                    key={stat.label}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.1 + idx * 0.05 }}
                    className="rounded-xl border border-border/60 bg-background/40 p-4"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Icon className="size-4 text-primary" />
                      <span className="text-xs text-muted-foreground">{stat.label}</span>
                    </div>
                    <div className="text-2xl font-bold text-foreground tabular-nums">
                      {stat.value.toLocaleString()}
                      <span className="text-sm font-normal text-muted-foreground ml-1">
                        {stat.unit}
                      </span>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* 作品信息 */}
            <div className="border-t border-border/60 pt-4 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">作品名</span>
                <span className="font-medium text-foreground">{book.title || '未命名作品'}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">分类</span>
                <span className="font-medium text-foreground">
                  {book.category === 'male' ? '男频' : '女频'} · {book.genre}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">最近编辑</span>
                <span className="font-medium text-foreground">
                  {format(book.updatedAt, 'yyyy-MM-dd HH:mm', { locale: zhCN })}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
