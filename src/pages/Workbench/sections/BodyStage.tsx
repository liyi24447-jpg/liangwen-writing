import { useState, useRef, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  PenTool,
  Sparkles,
  Play,
  RefreshCw,
  Wand2,
  ChevronLeft,
  BookMarked,
  Zap,
  FileText,
  Layers,
  Type,
} from 'lucide-react';
import { toast } from 'sonner';
import type { IBookWork, IChapter, IVolume } from '@/data/novel';
import { generateNovel, humanizeText, buildBookContextPrompt } from '@/lib/novel-generator';
import { saveBookOptimistic } from '@/lib/save-helper';

interface BodyStageProps {
  book: IBookWork;
  chapterId: string | null;
  onBookUpdate: (book: IBookWork) => void;
  onBackToList: () => void;
  onSelectChapter?: (chapterId: string) => void;
}

export default function BodyStage({ book, chapterId, onBookUpdate, onBackToList, onSelectChapter }: BodyStageProps) {
  const chapter = chapterId ? book.chapters.find((c) => c.id === chapterId) : null;
  const [content, setContent] = useState(chapter?.content || '');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isHumanizing, setIsHumanizing] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [targetWordCount, setTargetWordCount] = useState(3000);
  const [writingStyle, setWritingStyle] = useState(book.writingStyle || '');
  const [chapterTitleInput, setChapterTitleInput] = useState('');
  const [chapterSummaryInput, setChapterSummaryInput] = useState('');
  const contentRef = useRef<HTMLTextAreaElement>(null);

  // 切换章节时同步内容
  useEffect(() => {
    if (chapter) {
      setContent(chapter.content || '');
      setChapterTitleInput(chapter.title || '');
      setChapterSummaryInput(chapter.summary || '');
      setPrompt('');
    }
  }, [chapter?.id]);

  // 自动保存（防抖）——内容变化后延迟持久化
  useEffect(() => {
    if (!chapter || !content) return;
    const timer = setTimeout(() => {
      const updatedChapters = book.chapters.map((c) =>
        c.id === chapter.id
          ? { ...c, content, wordCount: content.length, updatedAt: Date.now(), status: 'completed' as const }
          : c
      );
      const updated = { ...book, chapters: updatedChapters };
      saveBookOptimistic(updated, onBookUpdate, { silent: true });
    }, 2000);
    return () => clearTimeout(timer);
  }, [content, chapter?.id]);

  const currentChapterIndex = chapter
    ? book.chapters.findIndex((c) => c.id === chapter.id)
    : -1;

  // 找到当前章所属卷
  const currentVolume: IVolume | undefined = chapter?.volumeId
    ? book.volumes.find((v) => v.id === chapter.volumeId)
    : undefined;

  const handleGenerate = useCallback(async () => {
    if (!chapter) {
      toast.warning('请先选择章节');
      return;
    }
    setIsGenerating(true);
    try {
      const bookContext = buildBookContextPrompt(book);
      const result = await generateNovel(
        {
          genre: book.genre,
          novel_type: '章节创作',
          setting: book.setting || book.synopsis,
          characters: book.characterProfiles.map((c) => c.name).join('、') || '',
          style: writingStyle || book.styleGuide || book.writingStyle,
          perspective: book.narrativePerspective === 'first' ? '第一人称' : '第三人称',
          chapter_title: chapterTitleInput || chapter.title,
          chapter_summary: chapterSummaryInput || chapter.summary || '',
          additional_requirements: prompt || `请创作一整章完整内容，约 ${targetWordCount} 字。`,
        },
        (piece) => {
          setContent((prev) => prev + piece);
        },
        bookContext
      );
      const finalContent = result || content;
      const updatedChapters = book.chapters.map((c) =>
        c.id === chapter.id
          ? {
              ...c,
              content: finalContent,
              wordCount: finalContent.length,
              status: 'completed' as const,
              title: chapterTitleInput || c.title,
              summary: chapterSummaryInput || c.summary,
            }
          : c
      );
      const updated = { ...book, chapters: updatedChapters };
      onBookUpdate(updated);
      toast.success('章节生成完成');
    } catch {
      toast.error('生成失败，请稍后重试');
    } finally {
      setIsGenerating(false);
    }
  }, [chapter, book, content, prompt, targetWordCount, writingStyle, chapterTitleInput, chapterSummaryInput, onBookUpdate]);

  const handleHumanize = async () => {
    if (!chapter || !content.trim()) return;
    setIsHumanizing(true);
    try {
      const result = await humanizeText(content, undefined, () => {
        // 流式更新用全量替换方式：等全部完成再一次性替换
      });
      setContent(result);
      toast.success('去 AI 味优化完成');
    } catch {
      toast.error('优化失败，请稍后重试');
    } finally {
      setIsHumanizing(false);
    }
  };

  const handleGenerateNextChapter = async () => {
    if (!chapter) return;
    // 找到下一章（同一卷内顺序的下一章）
    const sameVolChapters = book.chapters.filter((c) => c.volumeId === chapter.volumeId);
    const currentIdxInVol = sameVolChapters.findIndex((c) => c.id === chapter.id);
    const nextChapter = sameVolChapters[currentIdxInVol + 1];

    if (!nextChapter) {
      // 已是当前卷最后一章，提示用户
      toast.info('已是本卷最后一章，请先在章节管理中新增章节');
      return;
    }

    // 跳转到下一章，如果有 onSelectChapter 则直接跳转并触发生成
    if (onSelectChapter) {
      onSelectChapter(nextChapter.id);
      toast.info(`已切换到「${nextChapter.title}」，点击生成按钮开始创作`);
    } else {
      toast.info('下一章已规划，请在章节列表中选择');
    }
  };

  const handleRewrite = () => {
    if (!chapter) return;
    if (!content.trim()) {
      handleGenerate();
      return;
    }
    setContent('');
    // 延迟一点再生成，给用户反馈
    setTimeout(() => handleGenerate(), 100);
  };

  if (!chapter) {
    return (
      <div className="max-w-2xl mx-auto w-full">
        <Card className="border-primary/15 bg-card/80">
          <CardContent className="p-12 text-center">
            <PenTool className="size-10 text-primary/40 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">请在章节管理中选择一个章节进行创作</p>
            <Button variant="outline" className="mt-4" onClick={onBackToList}>
              前往章节管理
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto w-full">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="space-y-4"
      >
        {/* 章节头部 */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={onBackToList} className="text-sm">
            <ChevronLeft className="size-4 mr-1" />
            返回章节列表
          </Button>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <BookMarked className="size-4" />
            <span>{content.length} 字</span>
          </div>
        </div>

        {/* 标题区 */}
        <Card className="border-primary/15 bg-card/80 backdrop-blur-sm shadow-xl shadow-primary/5">
          <CardHeader className="pb-3 border-b border-border/60">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <PenTool className="size-5 text-primary" />
                {chapter.title}
              </CardTitle>
              <Badge variant="outline" className="border-primary/30 text-primary">
                正文生成
              </Badge>
            </div>
            {currentVolume && (
              <p className="text-xs text-muted-foreground mt-1">
                所属：{currentVolume.title}
              </p>
            )}
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            {chapter.summary && (
              <div className="text-sm text-muted-foreground bg-background/40 p-3 rounded-lg leading-relaxed">
                <span className="text-xs text-primary font-medium">章节梗概：</span>
                {chapter.summary}
              </div>
            )}

            {/* 创作指令 */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Zap className="size-4 text-primary" />
                <span className="font-medium">创作指令</span>
                <span className="text-xs text-muted-foreground">（可选）</span>
              </div>
              <Textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="描述本章需要突出的情节、情感基调、特殊要求..."
                className="min-h-[60px] resize-none bg-background/40 text-sm"
                disabled={isGenerating || isHumanizing}
              />
            </div>

            {/* 正文编辑区 */}
            <div className="relative">
              <Textarea
                ref={contentRef}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="点击下方「开始生成」AI 将为你创作本章内容..."
                className="min-h-[400px] resize-y bg-background/40 text-base leading-relaxed font-serif"
                 disabled={isGenerating || isHumanizing}
              />
              {isGenerating && (
                <div className="absolute bottom-3 right-3 flex items-center gap-1.5 text-xs text-primary bg-background/80 px-2 py-1 rounded">
                  <Sparkles className="size-3 animate-spin" />
                  AI 创作中...
                </div>
              )}
              {isHumanizing && (
                <div className="absolute bottom-3 right-3 flex items-center gap-1.5 text-xs text-amber-600 bg-background/80 px-2 py-1 rounded">
                  <Wand2 className="size-3 animate-spin" />
                  去 AI 味优化中...
                </div>
              )}
            </div>

            {/* 操作按钮 */}
            <div className="flex items-center gap-2 pt-2">
              {!content.trim() ? (
                <Button
                  onClick={handleGenerate}
                  disabled={isGenerating}
                  className="flex-1 h-11 bg-gradient-to-r from-primary to-emerald-500 text-primary-foreground hover:from-primary/90 hover:to-emerald-500/90 shadow-md shadow-primary/20 font-medium"
                >
                  <Play className="size-4 mr-2" />
                  {isGenerating ? '生成中...' : '开始生成'}
                </Button>
              ) : (
                <>
                  <Button
                    onClick={handleGenerateNextChapter}
                    disabled={isGenerating || isHumanizing}
                    className="flex-1 h-11 bg-gradient-to-r from-primary to-emerald-500 text-primary-foreground hover:from-primary/90 hover:to-emerald-500/90 shadow-md shadow-primary/20 font-medium"
                  >
                    <Play className="size-4 mr-2" />
                    下一章
                  </Button>
                  <Button variant="outline" onClick={handleHumanize} disabled={isHumanizing || isGenerating}>
                    <Wand2 className={`size-4 mr-1.5 ${isHumanizing ? 'animate-spin' : ''}`} />
                    去 AI 味
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={handleRewrite}
                    disabled={isGenerating}
                    className="text-muted-foreground"
                  >
                    <RefreshCw className={`size-4 mr-1.5 ${isGenerating ? 'animate-spin' : ''}`} />
                    重写
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
