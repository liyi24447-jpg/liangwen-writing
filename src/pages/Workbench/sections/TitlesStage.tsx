import { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Type, Check, RefreshCw, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import type { IBookWork } from '@/data/novel';
import { generateTitles } from '@/lib/novel-generator';
import { saveBookOptimistic } from '@/lib/save-helper';

interface TitlesStageProps {
  book: IBookWork;
  onBookUpdate: (book: IBookWork) => void;
}

export default function TitlesStage({ book, onBookUpdate }: TitlesStageProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [candidates, setCandidates] = useState<string[]>(book.titleCandidates || []);
  const [selectedTitle, setSelectedTitle] = useState(book.title);
  const [generatingText, setGeneratingText] = useState('');

  const handleGenerate = async () => {
    if (!book.styleDescription?.trim() && !book.synopsis?.trim() && !book.title?.trim()) {
      toast.warning('请先填写风格提示或故事简介');
      return;
    }
    setIsGenerating(true);
    setGeneratingText('');
    try {
      const titles = await generateTitles(
        book.genre,
        book.synopsis,
        book.styleGuide || '',
        (piece) => {
          setGeneratingText((prev) => prev + piece);
        }
      );
      setCandidates(titles);
      const updated = { ...book, titleCandidates: titles };
      const saved = await saveBookOptimistic(updated, onBookUpdate, { silent: true });
      if (saved) {
        toast.success(`生成了 ${titles.length} 个书名候选，已自动保存`);
      } else {
        toast.warning('书名候选已生成，但保存失败');
      }
    } catch {
      // error handled
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSelect = (title: string) => {
    setSelectedTitle(title);
    const updated = { ...book, title };
    onBookUpdate(updated);
    toast.success('已选定书名');
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
              <Type className="size-5 text-primary" />
              书名生成
            </CardTitle>
            <p className="text-xs text-muted-foreground leading-relaxed mt-1">
              根据故事梗概与创作风格，AI 为你生成多个有吸引力的书名候选，点击即可选定。
            </p>
          </CardHeader>
          <CardContent className="p-6 space-y-5">
            {/* 当前书名 */}
            <div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
              <div className="text-xs text-muted-foreground mb-1">当前书名</div>
              <div className="text-xl font-bold text-foreground">
                {selectedTitle || '未命名作品'}
              </div>
            </div>

            {/* 候选列表 */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-foreground">
                  书名候选
                  {candidates.length > 0 && (
                    <Badge variant="outline" className="ml-2 text-xs border-primary/30 text-primary">
                      {candidates.length} 个
                    </Badge>
                  )}
                </span>
                {candidates.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={handleGenerate}
                    disabled={isGenerating}
                  >
                    <RefreshCw className={`size-3.5 mr-1 ${isGenerating ? 'animate-spin' : ''}`} />
                    换一批
                  </Button>
                )}
              </div>

              {candidates.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {candidates.map((title, idx) => {
                    const isSelected = selectedTitle === title;
                    return (
                      <motion.button
                        key={idx}
                        whileHover={{ y: -2 }}
                        onClick={() => handleSelect(title)}
                        className={`relative p-3 rounded-lg border text-left transition-all ${
                          isSelected
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-border/60 bg-background/40 text-foreground hover:border-primary/40 hover:bg-primary/5'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{title}</span>
                          {isSelected && <Check className="size-4" />}
                        </div>
                      </motion.button>
                    );
                  })}
                </div>
              ) : isGenerating ? (
                <div className="rounded-lg border border-border/60 bg-background/40 p-6 text-center">
                  <Sparkles className="size-6 text-primary animate-spin mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">正在生成书名...</p>
                  <div className="mt-3 text-xs text-muted-foreground max-w-xs mx-auto text-left whitespace-pre-wrap">
                    {generatingText}
                  </div>
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-border/80 bg-background/20 p-8 text-center space-y-4">
                  <Type className="size-8 text-muted-foreground/40 mx-auto" />
                  <div>
                    <p className="text-sm text-muted-foreground mb-3">还没有书名候选</p>
                    <Button
                      onClick={handleGenerate}
                      disabled={isGenerating}
                      className="bg-gradient-to-r from-primary to-emerald-500 text-primary-foreground shadow-md shadow-primary/20"
                    >
                      <Sparkles className="size-4 mr-2" />
                      开始生成书名
                    </Button>
                  </div>
                  {(!book.styleDescription?.trim() && !book.synopsis?.trim() && !book.title?.trim()) && (
                    <p className="text-xs text-muted-foreground/70">
                      建议先完成创作风格和故事梗概，生成的书名更精准
                    </p>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
