import { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Wand2, BookOpen, Type, RefreshCw } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { toast } from 'sonner';
import type { IBookWork } from '@/data/novel';
import { generateStyleGuide } from '@/lib/novel-generator';
import { saveBookOptimistic } from '@/lib/save-helper';

interface StyleStageProps {
  book: IBookWork;
  onBookUpdate: (book: IBookWork) => void;
}

export default function StyleStage({ book, onBookUpdate }: StyleStageProps) {
  const [stylePrompt, setStylePrompt] = useState(book.styleDescription || '');
  const [isGenerating, setIsGenerating] = useState(false);
  const [displayContent, setDisplayContent] = useState(book.styleGuide || '');

  const categoryLabel = book.category === 'male' ? '男频' : '女频';

  const handleGenerate = async () => {
    if (!stylePrompt.trim()) {
      toast.warning('请填写风格提示');
      return;
    }
    setIsGenerating(true);
    setDisplayContent('');
    try {
      const full = await generateStyleGuide(
        book.genre,
        categoryLabel,
        stylePrompt,
        (piece) => {
          setDisplayContent((prev) => prev + piece);
        }
      );
      const updated = { ...book, styleDescription: stylePrompt, styleGuide: full };
      const saved = await saveBookOptimistic(updated, onBookUpdate, { silent: true });
      if (saved) {
        toast.success('创作风格指南生成完成，已自动保存');
      } else {
        toast.warning('风格指南已生成，但保存失败');
      }
    } catch {
      // error handled in generator
    } finally {
      setIsGenerating(false);
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
              <Wand2 className="size-5 text-primary" />
              创作风格
            </CardTitle>
            <p className="text-xs text-muted-foreground leading-relaxed mt-1">
              本区为后续梗概、卷纲、正文的前置量。先确认风格提示，再在右侧点击「开始生成」，成稿直接在下方编辑后自动保存。
            </p>
          </CardHeader>
          <CardContent className="p-6 space-y-5">
            {/* 基本信息 */}
            <div className="space-y-3">
              <div className="text-sm font-medium text-foreground">基本信息</div>
              <div className="space-y-2.5 text-sm">
                <div className="flex items-center gap-3">
                  <span className="text-muted-foreground w-20 shrink-0">书名</span>
                  <span className="font-medium text-foreground truncate">
                    {book.title || '未命名作品'}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-muted-foreground w-20 shrink-0">分类提示</span>
                  <Badge variant="outline" className="border-primary/30 text-primary">
                    {categoryLabel} · {book.genre}
                  </Badge>
                </div>
              </div>
            </div>

            {/* 风格提示 */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-foreground">风格提示</span>
                <span className="text-[11px] text-muted-foreground">{stylePrompt.length} 字</span>
              </div>
              <div className="relative">
                <Textarea
                  value={stylePrompt}
                  onChange={(e) => setStylePrompt(e.target.value)}
                  placeholder="生成创作风格描写的核心文本，例如：主角为落魄穷小子休妻 脱离江湖..."
                  className="min-h-[100px] resize-none bg-background/40 border-primary/20 focus:border-primary/50"
                  disabled={isGenerating}
                />
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                本区创作风格描写将以此为准，可直接点击编辑
              </p>
            </div>

            {/* 风格指南结果 */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-foreground">创作风格指南</span>
                {displayContent && !isGenerating && (
                  <button
                    onClick={handleGenerate}
                    className="text-xs text-primary hover:underline flex items-center gap-1"
                  >
                    <RefreshCw className="size-3" />
                    重新生成
                  </button>
                )}
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                尚未生成。请先确认上方风格提示，再在右侧点击「开始生成」，成稿直接在下方编辑后自动保存。
              </p>
              <div className="rounded-lg border border-border/60 bg-background/40 p-4 min-h-[200px] max-h-[400px] overflow-y-auto">
                {isGenerating || displayContent ? (
                  <article className="prose prose-sm max-w-none prose-p:leading-relaxed prose-p:text-foreground/90 prose-p:my-3 prose-headings:text-foreground dark:prose-invert">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{displayContent}</ReactMarkdown>
                    {isGenerating && (
                      <span className="inline-block w-1.5 h-5 bg-primary/60 ml-1 animate-pulse align-middle" />
                    )}
                  </article>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center py-8 text-muted-foreground">
                    <Sparkles className="size-8 text-primary/40 mb-3" />
                    <p className="text-sm">点击右侧「开始生成」生成创作风格指南</p>
                  </div>
                )}
              </div>
            </div>
            {/* 生成按钮 */}
            <div className="pt-2 space-y-2">
              {!stylePrompt.trim() && !isGenerating && (
                <p className="text-xs text-muted-foreground text-center">
                  请先填写风格提示后再生成
                </p>
              )}
              <Button
                onClick={handleGenerate}
                disabled={isGenerating || !stylePrompt.trim()}
                className="w-full h-11 bg-gradient-to-r from-primary to-emerald-500 text-primary-foreground hover:from-primary/90 hover:to-emerald-500/90 shadow-md shadow-primary/20 font-medium"
              >
                {isGenerating ? (
                  <>
                    <Sparkles className="size-4 mr-2 animate-spin" />
                    生成中...
                  </>
                ) : (
                  <>
                    <Wand2 className="size-4 mr-2" />
                    开始生成创作风格
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
