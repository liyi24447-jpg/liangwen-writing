import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { FileText, RefreshCw, Sparkles, Copy } from 'lucide-react';
import { toast } from 'sonner';
import type { IBookWork } from '@/data/novel';
import { generateBlurb } from '@/lib/novel-generator';
import { saveBookOptimistic } from '@/lib/save-helper';

interface BlurbStageProps {
  book: IBookWork;
  onBookUpdate: (book: IBookWork) => void;
}

export default function BlurbStage({ book, onBookUpdate }: BlurbStageProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [displayContent, setDisplayContent] = useState(book.blurb || '');
  const [customReq, setCustomReq] = useState('');

  // 当 book.blurb 变化（如右侧面板同步）时更新展示
  useEffect(() => {
    if (!isGenerating) {
      setDisplayContent(book.blurb || '');
    }
  }, [book.blurb, isGenerating]);

  const handleGenerate = async () => {
    if (!book.synopsis?.trim() && !book.styleDescription?.trim()) {
      toast.warning('请先填写故事梗概或风格提示');
      return;
    }
    setIsGenerating(true);
    setDisplayContent('');
    try {
      const full = await generateBlurb(
        book.genre,
        book.title,
        book.synopsis || book.styleDescription || '',
        (piece) => {
          setDisplayContent((prev) => prev + piece);
        },
        {
          wordCount: book.blurbWordCount || '300',
          focus: book.blurbFocus || 'plot',
          extra: customReq || undefined,
          styleGuide: book.styleGuide || book.styleDescription || '',
        }
      );
      const updated = { ...book, blurb: full };
      const saved = await saveBookOptimistic(updated, onBookUpdate, { silent: true });
      if (saved) {
        toast.success('内容简介生成完成，已自动保存');
      } else {
        toast.warning('简介已生成，但保存失败，请手动刷新确认');
      }
    } catch {
      // error handled
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = async () => {
    if (!displayContent) return;
    try {
      await navigator.clipboard.writeText(displayContent);
      toast.success('已复制到剪贴板');
    } catch {
      toast.error('复制失败');
    }
  };

  return (
    <div className="max-w-2xl mx-auto w-full">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Card className="border-primary/15 bg-card/80 backdrop-blur-sm shadow-xl shadow-primary/5">
          <CardHeader className="pb-4 border-b border-border/60">
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="size-5 text-primary" />
              内容简介
            </CardTitle>
            <p className="text-xs text-muted-foreground leading-relaxed mt-1">
              基于故事梗概生成吸引人的内容简介，用于书籍详情页、推荐位等展示场景。
            </p>
          </CardHeader>
          <CardContent className="p-6 space-y-5">
            {/* 简介结果 */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-foreground">内容简介</span>
                {displayContent && !isGenerating && (
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={handleCopy}
                    >
                      <Copy className="size-3.5 mr-1" />
                      复制
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={handleGenerate}
                    >
                      <RefreshCw className="size-3.5 mr-1" />
                      重新生成
                    </Button>
                  </div>
                )}
              </div>
              <div className="rounded-lg border border-border/60 bg-background/40 p-5 min-h-[180px]">
                {displayContent || isGenerating ? (
                  <div className="text-foreground leading-relaxed whitespace-pre-wrap">
                    {displayContent}
                    {isGenerating && (
                      <span className="inline-block w-1.5 h-5 bg-primary/60 ml-1 animate-pulse align-middle" />
                    )}
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center py-6 text-muted-foreground space-y-3">
                    <FileText className="size-8 text-primary/40" />
                    <div>
                      <p className="text-sm mb-3">还没有内容简介</p>
                      <Button
                        onClick={handleGenerate}
                        disabled={isGenerating}
                        className="bg-gradient-to-r from-primary to-emerald-500 text-primary-foreground shadow-md shadow-primary/20"
                      >
                        <Sparkles className="size-4 mr-2" />
                        开始生成简介
                      </Button>
                    </div>
                    {(!book.synopsis?.trim() && !book.styleDescription?.trim()) && (
                      <p className="text-xs text-muted-foreground/70">
                        建议先完成故事梗概，生成的简介更贴合内容
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* 自定义要求 */}
            <div className="space-y-2">
              <span className="text-sm font-medium text-foreground">补充要求（可选）</span>
              <Textarea
                value={customReq}
                onChange={(e) => setCustomReq(e.target.value)}
                placeholder="例如：要突出悬念感、强调爱情线、适合年轻读者..."
                className="min-h-[70px] resize-none bg-background/40 text-sm"
                disabled={isGenerating}
              />
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
