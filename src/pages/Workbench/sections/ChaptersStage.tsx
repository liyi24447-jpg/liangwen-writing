import { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  BookMarked,
  ChevronRight,
  Sparkles,
  Layers,
  Plus,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import type { IBookWork, IChapter } from '@/data/novel';
import { generateChapterPlan } from '@/lib/novel-generator';
import { saveBookOptimistic } from '@/lib/save-helper';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog';

interface ChaptersStageProps {
  book: IBookWork;
  onSelectChapter: (chapterId: string) => void;
  onBookUpdate?: (book: IBookWork) => void;
}

export default function ChaptersStage({ book, onSelectChapter, onBookUpdate }: ChaptersStageProps) {
  const [selectedVolumeId, setSelectedVolumeId] = useState<string | null>(
    book.volumes?.[0]?.id || null
  );
  const [isGenerating, setIsGenerating] = useState(false);
  const [chapterCount, setChapterCount] = useState(20);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newSummary, setNewSummary] = useState('');

  const volumes = book.volumes || [];
  const chapters = selectedVolumeId
    ? book.chapters.filter((c) => c.volumeId === selectedVolumeId)
    : book.chapters;

  const handleGenerateChapters = async () => {
    if (!book.synopsis?.trim() && !book.styleDescription?.trim() && !book.outline?.trim()) {
      toast.warning('请先填写故事梗概、风格提示或大纲');
      return;
    }
    setIsGenerating(true);
    try {
      const chaptersResult = await generateChapterPlan(
        '正文',
        book.outline || book.synopsis || '',
        book.synopsis || book.styleDescription || '',
        chapterCount,
        () => {}
      );
      const newChapters: IChapter[] = chaptersResult.map((ch, idx) => ({
        id: `ch_direct_${idx}_${Date.now()}`,
        title: ch.title,
        summary: ch.summary,
        wordCount: 0,
        content: '',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        status: 'draft',
        volumeId: undefined,
      }));
      const updated = {
        ...book,
        chapters: newChapters,
        chapterCount: newChapters.length,
        volumes: [],
      };
      const saved = await saveBookOptimistic(updated, onBookUpdate, { silent: true });
      if (saved) {
        toast.success(`生成了 ${newChapters.length} 个章节，已自动保存`);
      } else {
        toast.warning('章节已生成，但保存失败');
      }
    } catch {
      toast.error('章节生成失败，请稍后重试');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAddChapter = () => {
    if (!newTitle.trim()) {
      toast.warning('请输入章节名称');
      return;
    }
    const newChapter: IChapter = {
      id: `ch_manual_${Date.now()}`,
      title: newTitle.trim(),
      summary: newSummary.trim() || undefined,
      wordCount: 0,
      content: '',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      status: 'draft',
      volumeId: selectedVolumeId || undefined,
    };
    const updatedChapters = [...book.chapters, newChapter];
    const updated = {
      ...book,
      chapters: updatedChapters,
      chapterCount: updatedChapters.length,
    };
    // 如果有卷归属，更新对应卷的 chapterCount
    if (selectedVolumeId) {
      updated.volumes = book.volumes.map((v) =>
        v.id === selectedVolumeId
          ? { ...v, chapterCount: v.chapterCount + 1, updatedAt: Date.now() }
          : v
      );
    }
    onBookUpdate?.(updated);
    toast.success('已添加新章节');
    setAddDialogOpen(false);
    setNewTitle('');
    setNewSummary('');
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
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <BookMarked className="size-5 text-primary" />
                章节管理
              </CardTitle>
              <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="h-7 text-xs">
                    <Plus className="size-3.5 mr-1" />
                    新增章节
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>新增章节</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-3 py-2">
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium">章节名称</label>
                      <Input
                        value={newTitle}
                        onChange={(e) => setNewTitle(e.target.value)}
                        placeholder="例如：第一章 初入江湖"
                        className="bg-background/60"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium">
                        章节梗概 <span className="text-muted-foreground text-xs">（可选）</span>
                      </label>
                      <Textarea
                        value={newSummary}
                        onChange={(e) => setNewSummary(e.target.value)}
                        placeholder="简要描述本章主要情节..."
                        className="min-h-[80px] resize-none bg-background/60 text-sm"
                      />
                    </div>
                    {selectedVolumeId && (
                      <p className="text-xs text-muted-foreground">
                        将添加到当前选中的卷中
                      </p>
                    )}
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
                      取消
                    </Button>
                    <Button onClick={handleAddChapter}>
                      <Plus className="size-4 mr-1.5" />
                      添加
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed mt-1">
              浏览全书章节列表，点击章节进入正文生成与编辑。
            </p>
          </CardHeader>
          <CardContent className="p-0">
            {/* 卷 Tab */}
            {volumes.length > 0 && (
              <div className="flex gap-1 px-4 py-2 border-b border-border/60 overflow-x-auto">
                {volumes.map((vol, idx) => (
                  <button
                    key={vol.id}
                    onClick={() => setSelectedVolumeId(vol.id)}
                    className={`px-3 py-1.5 rounded-md text-xs whitespace-nowrap transition-colors ${
                      selectedVolumeId === vol.id
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
                    }`}
                  >
                    第{idx + 1}卷
                  </button>
                ))}
              </div>
            )}

            {/* 章节列表 */}
            <div className="max-h-[500px] overflow-y-auto">
              {chapters.length > 0 ? (
                <div className="divide-y divide-border/40">
                  {chapters.map((chapter, idx) => {
                    const hasContent = chapter.content.length > 0;
                    return (
                      <button
                        key={chapter.id}
                        onClick={() => onSelectChapter(chapter.id)}
                        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-accent/30 transition-colors group"
                      >
                        <span className="text-xs text-muted-foreground tabular-nums w-10 shrink-0">
                          {String(idx + 1).padStart(2, '0')}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-foreground truncate text-sm">
                            {chapter.title}
                          </div>
                          {chapter.summary && (
                            <div className="text-xs text-muted-foreground truncate mt-0.5">
                              {chapter.summary}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-xs text-muted-foreground tabular-nums">
                            {chapter.wordCount} 字
                          </span>
                          {hasContent ? (
                            <Badge className="bg-emerald-100 text-emerald-700 border-0 text-[10px]">
                              已完成
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px]">
                              待生成
                            </Badge>
                          )}
                          <ChevronRight className="size-4 text-muted-foreground group-hover:text-primary transition-colors" />
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : volumes.length === 0 ? (
                <div className="py-12 text-center space-y-4">
                  <Layers className="size-10 text-primary/40 mx-auto" />
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">还没有章节</p>
                    <p className="text-xs text-muted-foreground/70 mb-4">
                      可以先去「卷管理」生成卷结构，或直接生成章节列表
                    </p>
                  </div>
                  <div className="flex items-center justify-center gap-2 mb-4">
                    <span className="text-xs text-muted-foreground">章节数：</span>
                    <div className="flex gap-1">
                      {[10, 20, 30, 50].map((n) => (
                        <button
                          key={n}
                          onClick={() => setChapterCount(n)}
                          className={`px-2 py-0.5 rounded text-xs transition-colors ${
                            chapterCount === n
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-background/60 border border-border/60 text-foreground hover:border-primary/40'
                          }`}
                        >
                          {n}
                        </button>
                      ))}
                    </div>
                  </div>
                  <Button
                    onClick={handleGenerateChapters}
                    disabled={isGenerating}
                    className="bg-gradient-to-r from-primary to-emerald-500 text-primary-foreground hover:from-primary/90 hover:to-emerald-500/90 shadow-md shadow-primary/20"
                  >
                    <Sparkles className={`size-4 mr-2 ${isGenerating ? 'animate-spin' : ''}`} />
                    {isGenerating ? '生成中...' : 'AI 生成章节列表'}
                  </Button>
                </div>
              ) : (
                <div className="py-16 text-center">
                  <BookMarked className="size-10 text-primary/40 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground mb-3">本卷暂无章节</p>
                  <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Plus className="size-3.5 mr-1" />
                        手动添加章节
                      </Button>
                    </DialogTrigger>
                  </Dialog>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
