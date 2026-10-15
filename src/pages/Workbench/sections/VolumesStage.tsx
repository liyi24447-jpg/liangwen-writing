import { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Layers,
  ChevronDown,
  ChevronRight,
  Sparkles,
  BookMarked,
  Plus,
  RefreshCw,
  ListOrdered,
} from 'lucide-react';
import { toast } from 'sonner';
import type { IBookWork, IChapter } from '@/data/novel';
import type { IVolume } from '@/data/novel';
import {
  generateVolumePlan,
  generateChapterPlan,
} from '@/lib/novel-generator';
import { saveBookOptimistic } from '@/lib/save-helper';

interface VolumesStageProps {
  book: IBookWork;
  onBookUpdate: (book: IBookWork) => void;
}

const PRESET_COUNTS = [2, 3, 4, 5];
const CHAPTER_PRESETS = [
  { label: '精简', count: 6 },
  { label: '标准', count: 10 },
  { label: '适中', count: 14 },
  { label: '丰富', count: 20 },
];
const VOLUME_MIN = 1;
const VOLUME_MAX = 20;
const CHAPTER_MIN = 1;
const CHAPTER_MAX = 30;

export default function VolumesStage({ book, onBookUpdate }: VolumesStageProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatingText, setGeneratingText] = useState('');
  const [expandedVolume, setExpandedVolume] = useState<string | null>(null);
  const [volumeCount, setVolumeCount] = useState(3);
  const [customCount, setCustomCount] = useState('');
  const [isCustom, setIsCustom] = useState(false);
  const [chapterPresetIdx, setChapterPresetIdx] = useState(1);
  const [customChapterCount, setCustomChapterCount] = useState('');
  const [isCustomChapter, setIsCustomChapter] = useState(false);
  const [showRegenPanel, setShowRegenPanel] = useState(false);

  const volumes = book.volumes || [];

  const activeVolumeCount = isCustom
    ? Math.max(VOLUME_MIN, Math.min(VOLUME_MAX, parseInt(customCount, 10) || VOLUME_MIN))
    : volumeCount;

  const activeChapterCount = isCustomChapter
    ? Math.max(CHAPTER_MIN, Math.min(CHAPTER_MAX, parseInt(customChapterCount, 10) || CHAPTER_MIN))
    : CHAPTER_PRESETS[chapterPresetIdx].count;

  const handleSelectPreset = (n: number) => {
    setVolumeCount(n);
    setIsCustom(false);
  };

  const handleEnableCustom = () => {
    setIsCustom(true);
    if (!customCount) setCustomCount('6');
  };

  const handleSelectChapterPreset = (idx: number) => {
    setChapterPresetIdx(idx);
    setIsCustomChapter(false);
  };

  const handleEnableCustomChapter = () => {
    setIsCustomChapter(true);
    if (!customChapterCount) setCustomChapterCount(String(CHAPTER_PRESETS[chapterPresetIdx].count));
  };

  const handleGenerate = async () => {
    if (!book.synopsis?.trim() && !book.styleDescription?.trim() && !book.outline?.trim()) {
      toast.warning('请先填写故事梗概、风格提示或大纲');
      return;
    }
    const count = activeVolumeCount;
    if (count < VOLUME_MIN || count > VOLUME_MAX) {
      toast.warning(`卷数需在 ${VOLUME_MIN}-${VOLUME_MAX} 之间`);
      return;
    }
    const chCount = activeChapterCount;
    if (chCount < CHAPTER_MIN || chCount > CHAPTER_MAX) {
      toast.warning(`每卷章节数需在 ${CHAPTER_MIN}-${CHAPTER_MAX} 之间`);
      return;
    }
    setIsGenerating(true);
    setGeneratingText('');
    try {
      // 第一步：AI 生成卷划分
      const volumePlan = await generateVolumePlan(
        {
          genre: book.genre,
          title: book.title || '',
          synopsis: book.synopsis || book.styleDescription || '',
          outline: book.outline,
          styleGuide: book.styleGuide,
          volumeCount: count,
          chaptersPerVolume: chCount,
          characters: book.characterProfiles?.length
            ? book.characterProfiles.map((c) => `${c.name}（${c.identity || ''}）`).join('、')
            : '',
        },
        (piece) => {
          setGeneratingText((prev) => prev + piece);
        }
      );

      if (volumePlan.length === 0) {
        toast.error('卷划分生成失败，请重试');
        return;
      }

      // 第二步：为每卷生成章节规划
      const newVolumes: IVolume[] = [];
      let allChapters: IChapter[] = [];
      const ts = Date.now();
      // 用于匹配旧章节正文：归一化标题（去数字/空格/卷序）
      const normTitle = (t: string) =>
        t
          .replace(/^第[\d一二三四五六七八九十百千零〇两]+[章回卷节]/, '')
          .replace(/^[\d\s.、-]+/, '')
          .trim();

      const oldChapters = book.chapters || [];
      let preservedCount = 0;

      for (let v = 0; v < volumePlan.length; v++) {
        const vol = volumePlan[v];
        const chapters = await generateChapterPlan(
          vol.title,
          book.outline || book.synopsis || '',
          book.synopsis || book.styleDescription || '',
          vol.chapterCount || chCount,
          () => {}
        );
        const volumeId = `vol_${v}_${ts}`;
        const volChapters = chapters.map((ch, idx) => {
          const newTitle = ch.title;
          const normNew = normTitle(newTitle);
          // 优先在同卷序号位置匹配，其次按标题归一化匹配
          let matched: IChapter | undefined;
          const volOldChapters = oldChapters.filter((c) => c.volumeId && oldChapters.filter((o) => o.volumeId === c.volumeId).length > 0).length > 0
            ? oldChapters
            : oldChapters;
          // 策略1：同位置（全局序号）旧章节标题相似则继承
          const globalIdx = allChapters.length + idx;
          if (volOldChapters[globalIdx] && volOldChapters[globalIdx].content) {
            const oldNorm = normTitle(volOldChapters[globalIdx].title);
            if (oldNorm && normNew && (oldNorm === normNew || newTitle.includes(volOldChapters[globalIdx].title) || volOldChapters[globalIdx].title.includes(newTitle))) {
              matched = volOldChapters[globalIdx];
            }
          }
          // 策略2：全量按标题归一化精确匹配
          if (!matched && normNew) {
            matched = oldChapters.find(
              (oc) => oc.content && normTitle(oc.title) === normNew
            );
          }
          if (matched) preservedCount++;
          return {
            id: matched?.id ?? `ch_${v}_${idx}_${ts}_${Math.random().toString(36).slice(2, 6)}`,
            title: newTitle,
            summary: ch.summary,
            wordCount: matched?.content ? matched.content.length : 0,
            content: matched?.content || '',
            createdAt: matched?.createdAt ?? ts,
            updatedAt: ts,
            status: matched?.content ? ('completed' as const) : ('draft' as const),
            volumeId,
          };
        });
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
      onBookUpdate(updated);
      setShowRegenPanel(false);
      toast.success(
        `生成了 ${newVolumes.length} 卷 ${allChapters.length} 章${preservedCount > 0 ? `，已保留 ${preservedCount} 章正文` : ''}`
      );
    } catch (err) {
      toast.error('卷结构生成失败，请稍后重试');
    } finally {
      setIsGenerating(false);
    }
  };

  const getVolumeChapters = (volumeId: string) => {
    return book.chapters.filter((c) => c.volumeId === volumeId);
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
              <Layers className="size-5 text-primary" />
              卷管理
            </CardTitle>
            <p className="text-xs text-muted-foreground leading-relaxed mt-1">
              基于故事设定 AI 自动划分卷结构，每卷包含若干章节。可点击展开查看卷内章节列表。
            </p>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            {volumes.length > 0 ? (
              <>
                {/* 操作栏 */}
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="border-primary/30 text-primary">
                    共 {volumes.length} 卷 · {book.chapters.length} 章
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => setShowRegenPanel((v) => !v)}
                    disabled={isGenerating}
                  >
                    <RefreshCw className={`size-3.5 mr-1 ${isGenerating ? 'animate-spin' : ''}`} />
                    {showRegenPanel ? '收起设置' : '重新生成'}
                  </Button>
                </div>

                {/* 重新生成设置面板 */}
                {showRegenPanel && (
                  <div className="rounded-lg border border-border/60 bg-background/40 p-4 space-y-4">
                    {isGenerating ? (
                      <div className="py-6 text-center space-y-3">
                        <Sparkles className="size-7 text-primary animate-spin mx-auto" />
                        <p className="text-sm text-muted-foreground">正在重新规划卷结构与章节...</p>
                        <div className="rounded-lg border border-border/60 bg-background/40 p-3 text-left text-xs text-muted-foreground max-h-[150px] overflow-y-auto whitespace-pre-wrap">
                          {generatingText}
                        </div>
                      </div>
                    ) : (
                      <>
                        {/* 卷数规划 */}
                        <div>
                          <Label className="text-xs font-medium text-foreground flex items-center gap-1.5 mb-2">
                            <Layers className="size-3.5 text-primary" />
                            卷数规划
                          </Label>
                          <div className="flex gap-1.5 items-center">
                            {PRESET_COUNTS.map((n) => (
                              <button
                                key={n}
                                onClick={() => handleSelectPreset(n)}
                                className={`flex-1 px-2 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                                  !isCustom && volumeCount === n
                                    ? 'bg-primary text-primary-foreground border border-primary'
                                    : 'bg-card/60 border border-border/60 text-foreground hover:border-primary/40'
                                }`}
                              >
                                {n} 卷
                              </button>
                            ))}
                            <button
                              onClick={handleEnableCustom}
                              className={`flex-1 px-2 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                                isCustom
                                  ? 'bg-primary text-primary-foreground border border-primary'
                                  : 'bg-card/60 border border-border/60 text-foreground hover:border-primary/40'
                              }`}
                            >
                              <Plus className="size-3 inline mr-0.5" />
                              自定义
                            </button>
                          </div>
                          {isCustom && (
                            <div className="flex items-center gap-2 mt-2">
                              <Input
                                type="number"
                                min={VOLUME_MIN}
                                max={VOLUME_MAX}
                                value={customCount}
                                onChange={(e) => setCustomCount(e.target.value)}
                                className="w-20 h-8 text-sm bg-card/60"
                                placeholder={`${VOLUME_MIN}-${VOLUME_MAX}`}
                              />
                              <span className="text-xs text-muted-foreground">卷</span>
                              <span className="text-[10px] text-muted-foreground ml-auto">
                                范围 {VOLUME_MIN}-{VOLUME_MAX} 卷
                              </span>
                            </div>
                          )}
                        </div>

                        {/* 每卷章节数 */}
                        <div>
                          <Label className="text-xs font-medium text-foreground flex items-center gap-1.5 mb-2">
                            <ListOrdered className="size-3.5 text-primary" />
                            每卷章节数
                          </Label>
                          <div className="grid grid-cols-5 gap-1.5">
                            {CHAPTER_PRESETS.map((p, idx) => (
                              <button
                                key={p.label}
                                onClick={() => handleSelectChapterPreset(idx)}
                                className={`px-1.5 py-1.5 rounded-lg text-[11px] font-medium transition-colors ${
                                  !isCustomChapter && chapterPresetIdx === idx
                                    ? 'bg-primary/10 border border-primary/30 text-foreground'
                                    : 'bg-card/60 border border-border/60 text-foreground hover:border-primary/40'
                                }`}
                              >
                                <div>{p.label}</div>
                                <div className="text-[9px] text-muted-foreground font-normal">
                                  {p.count}章
                                </div>
                              </button>
                            ))}
                            <button
                              onClick={handleEnableCustomChapter}
                              className={`px-1.5 py-1.5 rounded-lg text-[11px] font-medium transition-colors ${
                                isCustomChapter
                                  ? 'bg-primary/10 border border-primary/30 text-foreground'
                                  : 'bg-card/60 border border-border/60 text-foreground hover:border-primary/40'
                              }`}
                            >
                              <div className="flex items-center justify-center">
                                <Plus className="size-3 mr-0.5" />
                                自定义
                              </div>
                            </button>
                          </div>
                          {isCustomChapter && (
                            <div className="flex items-center gap-2 mt-2">
                              <Input
                                type="number"
                                min={CHAPTER_MIN}
                                max={CHAPTER_MAX}
                                value={customChapterCount}
                                onChange={(e) => setCustomChapterCount(e.target.value)}
                                className="w-20 h-8 text-sm bg-card/60"
                                placeholder={`${CHAPTER_MIN}-${CHAPTER_MAX}`}
                              />
                              <span className="text-xs text-muted-foreground">章 / 卷</span>
                              <span className="text-[10px] text-muted-foreground ml-auto">
                                范围 {CHAPTER_MIN}-{CHAPTER_MAX} 章
                              </span>
                            </div>
                          )}
                        </div>

                        <div className="flex gap-2 pt-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowRegenPanel(false)}
                            className="flex-1"
                          >
                            取消
                          </Button>
                          <Button
                            onClick={handleGenerate}
                            disabled={isGenerating}
                            className="flex-1 bg-gradient-to-r from-primary to-emerald-500 text-primary-foreground hover:from-primary/90 hover:to-emerald-500/90"
                          >
                            <Sparkles className="size-3.5 mr-1.5" />
                            确认重新生成
                          </Button>
                        </div>
                        <p className="text-[10px] text-muted-foreground text-center">
                          重新生成将覆盖现有卷结构与章节
                        </p>
                      </>
                    )}
                  </div>
                )}

                {/* 卷列表 */}
                <div className="space-y-2">
                  {volumes.map((volume, idx) => {
                    const volChapters = getVolumeChapters(volume.id);
                    const isExpanded = expandedVolume === volume.id;
                    return (
                      <div
                        key={volume.id}
                        className="rounded-lg border border-border/60 bg-background/40 overflow-hidden"
                      >
                        <button
                          onClick={() => setExpandedVolume(isExpanded ? null : volume.id)}
                          className="w-full flex items-center gap-3 p-3 text-left hover:bg-accent/30 transition-colors"
                        >
                          <span className="text-xs text-muted-foreground tabular-nums w-12 shrink-0">
                            第{idx + 1}卷
                          </span>
                          <span className="font-medium text-foreground flex-1 truncate">
                            {volume.title}
                          </span>
                          <Badge variant="outline" className="text-xs shrink-0">
                            {volChapters.length} 章
                          </Badge>
                          {isExpanded ? (
                            <ChevronDown className="size-4 text-muted-foreground shrink-0" />
                          ) : (
                            <ChevronRight className="size-4 text-muted-foreground shrink-0" />
                          )}
                        </button>
                        {isExpanded && (
                          <div className="border-t border-border/60 px-3 py-2 space-y-1 bg-background/20">
                            {volume.summary && (
                              <p className="text-xs text-muted-foreground mb-2 leading-relaxed">
                                {volume.summary}
                              </p>
                            )}
                            {volChapters.map((ch, chIdx) => (
                              <div
                                key={ch.id}
                                className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-background/60 text-sm"
                              >
                                <BookMarked className="size-3.5 text-primary/60 shrink-0" />
                                <span className="text-xs text-muted-foreground tabular-nums w-8 shrink-0">
                                  {chIdx + 1}.
                                </span>
                                <span className="flex-1 truncate text-foreground/80">
                                  {ch.title}
                                </span>
                                <span className="text-xs text-muted-foreground tabular-nums shrink-0">
                                  {ch.wordCount}字
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            ) : isGenerating ? (
              <div className="py-12 text-center space-y-4">
                <Sparkles className="size-8 text-primary animate-spin mx-auto" />
                <p className="text-sm text-muted-foreground">正在 AI 规划卷结构与章节...</p>
                <div className="rounded-lg border border-border/60 bg-background/40 p-4 text-left text-xs text-muted-foreground max-h-[200px] overflow-y-auto whitespace-pre-wrap">
                  {generatingText}
                </div>
              </div>
            ) : (
              <div className="space-y-5">
                <div className="py-8 text-center">
                  <Layers className="size-10 text-primary/40 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground mb-2">点击下方按钮生成卷结构</p>
                  <p className="text-xs text-muted-foreground/70">
                    AI 将根据故事设定自动划分卷与章节
                  </p>
                </div>

                {/* 卷数选择 */}
                <div className="space-y-3">
                  <div>
                    <Label className="text-xs font-medium text-foreground flex items-center gap-1.5 mb-2">
                      <Layers className="size-3.5 text-primary" />
                      卷数规划
                    </Label>
                    <div className="flex gap-1.5 items-center">
                      {PRESET_COUNTS.map((n) => (
                        <button
                          key={n}
                          onClick={() => handleSelectPreset(n)}
                          className={`flex-1 px-2 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                            !isCustom && volumeCount === n
                              ? 'bg-primary text-primary-foreground border border-primary'
                              : 'bg-background/40 border border-border/60 text-foreground hover:border-primary/40'
                          }`}
                        >
                          {n} 卷
                        </button>
                      ))}
                      <button
                        onClick={handleEnableCustom}
                        className={`flex-1 px-2 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                          isCustom
                            ? 'bg-primary text-primary-foreground border border-primary'
                            : 'bg-background/40 border border-border/60 text-foreground hover:border-primary/40'
                        }`}
                      >
                        <Plus className="size-3 inline mr-0.5" />
                        自定义
                      </button>
                    </div>
                    {isCustom && (
                      <div className="flex items-center gap-2 mt-2">
                        <Input
                          type="number"
                          min={VOLUME_MIN}
                          max={VOLUME_MAX}
                          value={customCount}
                          onChange={(e) => setCustomCount(e.target.value)}
                          className="w-20 h-8 text-sm bg-background/60"
                          placeholder={`${VOLUME_MIN}-${VOLUME_MAX}`}
                        />
                        <span className="text-xs text-muted-foreground">卷</span>
                        <span className="text-[10px] text-muted-foreground ml-auto">
                          范围 {VOLUME_MIN}-{VOLUME_MAX} 卷
                        </span>
                      </div>
                    )}
                  </div>

                  {/* 每卷章节数 */}
                  <div>
                    <Label className="text-xs font-medium text-foreground flex items-center gap-1.5 mb-2">
                      <ListOrdered className="size-3.5 text-primary" />
                      每卷章节数
                    </Label>
                    <div className="grid grid-cols-5 gap-1.5">
                      {CHAPTER_PRESETS.map((p, idx) => (
                        <button
                          key={p.label}
                          onClick={() => handleSelectChapterPreset(idx)}
                          className={`px-1.5 py-1.5 rounded-lg text-[11px] font-medium transition-colors ${
                            !isCustomChapter && chapterPresetIdx === idx
                              ? 'bg-primary/10 border border-primary/30 text-foreground'
                              : 'bg-background/40 border border-border/60 text-foreground hover:border-primary/40'
                          }`}
                        >
                          <div>{p.label}</div>
                          <div className="text-[9px] text-muted-foreground font-normal">
                            {p.count}章
                          </div>
                        </button>
                      ))}
                      <button
                        onClick={handleEnableCustomChapter}
                        className={`px-1.5 py-1.5 rounded-lg text-[11px] font-medium transition-colors ${
                          isCustomChapter
                            ? 'bg-primary/10 border border-primary/30 text-foreground'
                            : 'bg-background/40 border border-border/60 text-foreground hover:border-primary/40'
                        }`}
                      >
                        <div className="flex items-center justify-center">
                          <Plus className="size-3 mr-0.5" />
                          自定义
                        </div>
                      </button>
                    </div>
                    {isCustomChapter && (
                      <div className="flex items-center gap-2 mt-2">
                        <Input
                          type="number"
                          min={CHAPTER_MIN}
                          max={CHAPTER_MAX}
                          value={customChapterCount}
                          onChange={(e) => setCustomChapterCount(e.target.value)}
                          className="w-20 h-8 text-sm bg-background/60"
                          placeholder={`${CHAPTER_MIN}-${CHAPTER_MAX}`}
                        />
                        <span className="text-xs text-muted-foreground">章 / 卷</span>
                        <span className="text-[10px] text-muted-foreground ml-auto">
                          范围 {CHAPTER_MIN}-{CHAPTER_MAX} 章
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <Button
                  onClick={handleGenerate}
                  disabled={isGenerating}
                  className="w-full h-11 bg-gradient-to-r from-primary to-emerald-500 text-primary-foreground hover:from-primary/90 hover:to-emerald-500/90 shadow-md shadow-primary/20 font-medium"
                >
                  <Sparkles className="size-4 mr-2" />
                  AI 生成卷结构与章节
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
