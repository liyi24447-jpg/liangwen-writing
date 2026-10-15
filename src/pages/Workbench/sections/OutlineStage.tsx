import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ListOrdered,
  RefreshCw,
  Download,
  Sparkles,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  BookOpen,
} from 'lucide-react';
import { toast } from 'sonner';
import { logger } from '@lark-apaas/client-toolkit-lite';
import type { IBookWork, IVolume, IChapter } from '@/data/novel';
import { parseOutlineText } from '@/lib/novel-generator';
import { saveBookOptimistic } from '@/lib/save-helper';
import { cn } from '@/lib/utils';

interface OutlineStageProps {
  book: IBookWork;
  onBookUpdate: (book: IBookWork) => void;
}

export default function OutlineStage({ book, onBookUpdate }: OutlineStageProps) {
  const [isSyncing, setIsSyncing] = useState(false);
  const rawContent = book.outline || '';
  const [expandedVolumeIdx, setExpandedVolumeIdx] = useState<number | null>(0);
  const [viewMode, setViewMode] = useState<'structured' | 'raw'>('structured');

  // 解析大纲文本为结构化卷/章
  const parsedVolumes = useMemo(() => parseOutlineText(rawContent), [rawContent]);

  const [isRegenerating, setIsRegenerating] = useState(false);

  const hasContent = rawContent.trim().length > 0;
  const hasStructured = parsedVolumes.length > 0;

  const handleSyncToVolumes = async () => {
    if (!hasStructured) {
      toast.warning('大纲内容还无法解析为卷结构，请重新生成');
      return;
    }
    setIsSyncing(true);
    try {
      const ts = Date.now();
      const newVolumes: IVolume[] = [];
      let allChapters: IChapter[] = [];
      const oldChapters = book.chapters || [];
      let preservedCount = 0;

      const normTitle = (t: string) =>
        t
          .replace(/^第[\d一二三四五六七八九十百千零〇两]+[章回卷节]/, '')
          .replace(/^[\d\s.、-]+/, '')
          .trim();

      for (let v = 0; v < parsedVolumes.length; v++) {
        const vol = parsedVolumes[v];
        const volumeId = `vol_${v}_${ts}`;
        const volChapters: IChapter[] = [];
        const chapterCount = vol.chapters.length;

        for (let i = 0; i < chapterCount; i++) {
          const ch = vol.chapters[i];
          const newTitle = ch.title || `第${i + 1}章`;
          const normNew = normTitle(newTitle);
          let matched: IChapter | undefined;

          // 策略1：全局同位置旧章节标题相似则继承
          const globalIdx = allChapters.length + i;
          if (oldChapters[globalIdx]?.content) {
            const oldNorm = normTitle(oldChapters[globalIdx].title);
            if (
              oldNorm &&
              normNew &&
              (oldNorm === normNew ||
                newTitle.includes(oldChapters[globalIdx].title) ||
                oldChapters[globalIdx].title.includes(newTitle))
            ) {
              matched = oldChapters[globalIdx];
            }
          }
          // 策略2：全量按标题归一化精确匹配
          if (!matched && normNew) {
            matched = oldChapters.find(
              (oc) => oc.content && normTitle(oc.title) === normNew
            );
          }
          if (matched) preservedCount++;

          volChapters.push({
            id: matched?.id ?? `ch_${v}_${i}_${ts}_${Math.random().toString(36).slice(2, 6)}`,
            title: newTitle,
            summary: ch.summary || '',
            wordCount: matched?.content ? matched.content.length : 0,
            content: matched?.content || '',
            createdAt: matched?.createdAt ?? ts,
            updatedAt: ts,
            status: matched?.content ? 'completed' : 'draft',
            volumeId,
          });
        }

        newVolumes.push({
          id: volumeId,
          title: vol.title,
          summary: vol.summary,
          chapterCount: volChapters.length,
          createdAt: ts,
          updatedAt: ts,
        });
        allChapters = [...allChapters, ...volChapters];
      }

      const updated = {
        ...book,
        volumes: newVolumes,
        chapters: allChapters,
        chapterCount: allChapters.length,
      };
      saveBookOptimistic(updated, onBookUpdate);
      toast.success(
        `已同步 ${newVolumes.length} 卷 ${allChapters.length} 章${preservedCount > 0 ? `（保留 ${preservedCount} 章正文）` : ''}到卷管理`
      );
    } catch (error) {
      logger.error('[Outline] sync volumes failed:', String(error));
      toast.error('同步到卷管理失败，请重试');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleExport = () => {
    if (!rawContent) return;
    const blob = new Blob([rawContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${book.title || '详细大纲'}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('已导出');
  };

  const toggleVolume = (idx: number) => {
    setExpandedVolumeIdx(expandedVolumeIdx === idx ? null : idx);
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
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <ListOrdered className="size-5 text-primary" />
                  详细大纲
                </CardTitle>
                <p className="text-xs text-muted-foreground leading-relaxed mt-1">
                  基于故事梗概与创作风格，生成结构完整的小说详细大纲，包含卷划分与关键情节节点。
                </p>
              </div>
              {hasContent && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSyncToVolumes}
                  disabled={isSyncing || !hasStructured}
                  className="h-8 border-primary/30 text-primary hover:bg-primary/10 shrink-0"
                >
                  {isSyncing ? (
                    <>
                      <RefreshCw className="size-3.5 mr-1.5 animate-spin" />
                      同步中...
                    </>
                  ) : (
                    <>
                      <ArrowRight className="size-3.5 mr-1.5" />
                      同步到卷管理
                    </>
                  )}
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-6 space-y-5">
            {/* 大纲结果区 */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground">详细大纲</span>
                  {hasStructured && (
                    <Badge variant="outline" className="text-[10px] h-5 border-primary/30 text-primary">
                      {parsedVolumes.length} 卷
                    </Badge>
                  )}
                </div>
                 {hasContent && (
                   <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs border-primary/30 text-primary hover:bg-primary/5"
                        disabled={isRegenerating}
                        onClick={async () => {
                          if (!book.styleGuide?.trim() && !book.styleDescription?.trim()) {
                            toast.warning('请先完成创作风格设置');
                            return;
                          }
                          setIsRegenerating(true);
                          try {
                            const { generateOutline } = await import('@/lib/novel-generator');
                            const full = await generateOutline(
                              book.genre,
                              book.title || '未命名作品',
                              book.synopsis,
                              book.styleGuide || book.styleDescription || '',
                              () => {},
                              {
                                volumeCount: book.volumes?.length || 3,
                                chaptersPerVolume: 10,
                              }
                            );
                            const updated = { ...book, outline: full };
                            const saved = await saveBookOptimistic(updated, onBookUpdate, { silent: true });
                            if (saved) {
                              toast.success('详细大纲生成完成，已自动保存');
                            } else {
                              toast.warning('大纲已生成，但保存失败，请手动刷新确认');
                            }
                          } catch {
                            // 错误已在生成函数中处理
                          } finally {
                            setIsRegenerating(false);
                          }
                        }}
                      >
                       {isRegenerating ? (
                         <><RefreshCw className="size-3.5 mr-1 animate-spin" />生成中</>
                       ) : (
                         <><Sparkles className="size-3.5 mr-1" />重新生成</>
                       )}
                     </Button>
                     <Button
                       variant="ghost"
                       size="sm"
                       className="h-7 text-xs"
                       onClick={() => setViewMode(viewMode === 'structured' ? 'raw' : 'structured')}
                     >
                       <BookOpen className="size-3.5 mr-1" />
                       {viewMode === 'structured' ? '原文' : '结构'}
                     </Button>
                     <Button
                       variant="ghost"
                       size="sm"
                       className="h-7 text-xs"
                       onClick={handleExport}
                     >
                       <Download className="size-3.5 mr-1" />
                       导出
                     </Button>
                   </div>
                 )}
              </div>

              <div className="rounded-lg border border-border/60 bg-background/40 min-h-[280px] max-h-[480px] overflow-y-auto">
                  {/* 空状态 */}
                {!hasContent && (
                  <div className="h-full flex flex-col items-center justify-center text-center py-12 text-muted-foreground space-y-3">
                    <ListOrdered className="size-12 text-primary/30" />
                    <div>
                      <p className="text-sm font-medium text-foreground mb-1">还没有详细大纲</p>
                      <p className="text-xs text-muted-foreground mb-4">
                        在右侧「大纲参数」面板设置卷数、章节数与剧情走向
                        <br />
                        点击「开始生成」即可 AI 生成详细大纲
                      </p>
                      {!book.synopsis?.trim() && (
                        <p className="text-xs text-muted-foreground/70">
                          请先完成故事梗概，再生成详细大纲
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* 结构化展示 */}
                {hasContent && viewMode === 'structured' && (
                  <div className="p-4 space-y-3">
                    <AnimatePresence initial={false}>
                      {hasStructured ? (
                        parsedVolumes.map((vol, vIdx) => {
                          const isExpanded = expandedVolumeIdx === vIdx;
                          return (
                            <motion.div
                              key={vIdx}
                              initial={{ opacity: 0, y: 8 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ duration: 0.3, delay: vIdx * 0.05 }}
                              className="rounded-lg border border-border/60 bg-card/60 overflow-hidden"
                            >
                              <button
                                onClick={() => toggleVolume(vIdx)}
                                className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-primary/5 transition-colors"
                              >
                                <div className="flex items-center gap-3 min-w-0">
                                  <div className="size-7 shrink-0 rounded-full bg-primary/15 text-primary flex items-center justify-center text-xs font-bold">
                                    {vIdx + 1}
                                  </div>
                                  <div className="min-w-0">
                                    <div className="text-sm font-semibold text-foreground truncate">
                                      {vol.title}
                                    </div>
                                    {vol.summary && (
                                      <div className="text-xs text-muted-foreground truncate mt-0.5">
                                        {vol.summary}
                                      </div>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  <Badge variant="outline" className="text-[10px] h-5">
                                    {vol.chapters.length} 章
                                  </Badge>
                                  {isExpanded ? (
                                    <ChevronUp className="size-4 text-muted-foreground" />
                                  ) : (
                                    <ChevronDown className="size-4 text-muted-foreground" />
                                  )}
                                </div>
                              </button>
                              <AnimatePresence initial={false}>
                                {isExpanded && (
                                  <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.25 }}
                                    className="overflow-hidden"
                                  >
                                    <div className="px-4 pb-3 pt-1 space-y-1.5 border-t border-border/40">
                                      {vol.chapters.length > 0 ? (
                                        vol.chapters.map((ch, cIdx) => (
                                          <div
                                            key={cIdx}
                                            className="flex items-start gap-2 py-1.5"
                                          >
                                            <span className="text-xs font-medium text-primary/70 mt-0.5 shrink-0 w-8 text-right">
                                              {cIdx + 1}.
                                            </span>
                                            <div className="min-w-0 flex-1">
                                              <div className="text-sm text-foreground font-medium">
                                                {ch.title}
                                              </div>
                                              {ch.summary && (
                                                <div className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                                                  {ch.summary}
                                                </div>
                                              )}
                                            </div>
                                          </div>
                                        ))
                                      ) : (
                                        <div className="text-xs text-muted-foreground py-2">
                                          暂无章节详情
                                        </div>
                                      )}
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </motion.div>
                          );
                        })
                      ) : (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="p-6 text-center text-muted-foreground text-sm"
                        >
                          <p className="mb-2">未能解析为卷结构</p>
                          <p className="text-xs mb-3">可能大纲格式不规范，可切换到「原文」查看</p>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setViewMode('raw')}
                          >
                            查看原文
                          </Button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}

                {/* 原文展示 */}
                {hasContent && viewMode === 'raw' && (
                  <div className="p-5 text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed">
                    {rawContent}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
