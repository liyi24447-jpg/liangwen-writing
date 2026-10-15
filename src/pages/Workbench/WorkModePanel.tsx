import { useMemo, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Sparkles,
  BookOpen,
  FileText,
  ListOrdered,
  Users,
  Layers,
  PenTool,
  ScrollText,
  Target,
  Palette,
  Hash,
  Plus,
  Edit2,
  Trash2,
  ChevronUp,
  ChevronDown,
  X,
  Check,
  Wand2,
  Lightbulb,
  BookMarked,
  Upload,
  BookCopy,
  RefreshCw,
  GripVertical,
  MoveUp,
  MoveDown,
  ArrowRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { WorkStageKey } from './stages';
import type { IBookWork, IChapter, ICharacterProfile, ICharacterExtraField, IVolume } from '@/data/novel';
import {
  STAGES,
  PHASE_LABELS,
  computeCompletedStages,
  getPhaseStages,
} from './stages';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { generateOutline, parseOutlineText, generateCharacterProfiles } from '@/lib/novel-generator';
import { saveBookOptimistic } from '@/lib/save-helper';
import { logger } from '@lark-apaas/client-toolkit-lite';

interface WorkModePanelProps {
  book: IBookWork;
  currentStage: WorkStageKey;
  onStageChange: (stage: WorkStageKey) => void;
  selectedChapterId?: string | null;
  onBookUpdate: (book: IBookWork) => void;
  onSyncVolumesToChapters?: () => void;
}

const WORD_COUNT_PRESETS = [1000, 2000, 3000, 5000];
const STYLE_PRESETS = ['华丽唯美', '朴实真挚', '幽默风趣', '严肃深沉', '古风古韵', '现代简练'];

export default function WorkModePanel({
  book,
  currentStage,
  onStageChange,
  selectedChapterId,
  onBookUpdate,
  onSyncVolumesToChapters,
}: WorkModePanelProps) {
  const completed = useMemo(() => computeCompletedStages(book), [book]);

  const chapter: IChapter | undefined = selectedChapterId
    ? book.chapters.find((c) => c.id === selectedChapterId)
    : undefined;

  const currentVolume = chapter?.volumeId
    ? book.volumes.find((v) => v.id === chapter.volumeId)
    : undefined;

  const lastEditTime = useMemo(() => {
    try {
      return formatDistanceToNow(book.updatedAt, { addSuffix: true, locale: zhCN });
    } catch {
      return '';
    }
  }, [book.updatedAt]);

  // 概览阶段：显示创作总览 + 内容管理
  if (currentStage === 'overview') {
    return <OverviewPanel book={book} onStageChange={onStageChange} completed={completed} lastEditTime={lastEditTime} />;
  }

  // 创作风格阶段
  if (currentStage === 'style') {
    return <StylePanel book={book} onBookUpdate={onBookUpdate} />;
  }

  // 故事梗概阶段
  if (currentStage === 'synopsis') {
    return <SynopsisPanel book={book} onBookUpdate={onBookUpdate} />;
  }

  // 书名生成阶段
  if (currentStage === 'titles') {
    return <TitlesPanel book={book} onBookUpdate={onBookUpdate} />;
  }

  // 内容简介阶段
  if (currentStage === 'blurb') {
    return <BlurbPanel book={book} onBookUpdate={onBookUpdate} />;
  }

  // 详细大纲阶段
  if (currentStage === 'outline') {
    return <OutlinePanel book={book} onBookUpdate={onBookUpdate} />;
  }

  // 人物小传阶段
  if (currentStage === 'characters') {
    return <CharactersPanel book={book} onBookUpdate={onBookUpdate} />;
  }

  // 卷管理阶段
  if (currentStage === 'volumes') {
    return <VolumesPanel book={book} onBookUpdate={onBookUpdate} onSync={onSyncVolumesToChapters} />;
  }

  // 章节管理阶段
  if (currentStage === 'chapters') {
    return <ChaptersPanel book={book} onBookUpdate={onBookUpdate} />;
  }

  // 正文生成阶段
  if (currentStage === 'body') {
    return <BodyPanel book={book} chapter={chapter} currentVolume={currentVolume} />;
  }

  // 剧本生成阶段
  if (currentStage === 'script') {
    return <ScriptPanel book={book} chapter={chapter} />;
  }

  return null;
}

// ========== 概览面板（保留原创作总览+内容管理）==========
function OverviewPanel({
  book,
  onStageChange,
  completed,
  lastEditTime,
}: {
  book: IBookWork;
  onStageChange: (stage: WorkStageKey) => void;
  completed: Set<WorkStageKey>;
  lastEditTime: string;
}) {
  const phaseProgress = useMemo(() => {
    const phases = ['ideation', 'structure', 'writing'] as const;
    return phases.map((p) => {
      const stages = getPhaseStages(p);
      const done = stages.filter((s) => completed.has(s.key)).length;
      return { phase: p, done, total: stages.length };
    });
  }, [completed]);

  const currentStageDef = STAGES.find((s) => false);

  return (
    <div className="h-full flex flex-col">
      <div className="text-sm font-semibold text-foreground mb-3">创作总览</div>
      <div className="flex-1 overflow-y-auto space-y-4 pr-1">
        <div className="rounded-xl border border-border/60 bg-card/50 p-4 space-y-2">
          <div className="text-sm font-semibold text-foreground truncate">
            {book.title || '未命名作品'}
          </div>
          <div className="text-xs text-muted-foreground">总字数 {book.wordCount}</div>
          <div className="text-xs text-muted-foreground">最近编辑 {lastEditTime}</div>
        </div>

        <div className="space-y-3">
          {phaseProgress.map(({ phase, done, total }) => (
            <div key={phase} className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-foreground">{PHASE_LABELS[phase]}阶段</span>
                <span className="text-muted-foreground">
                  {done}/{total}
                </span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-primary to-emerald-500 transition-all"
                  style={{ width: total > 0 ? `${(done / total) * 100}%` : '0%' }}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-2">
          <div className="text-xs font-medium text-foreground">快速跳转</div>
          {(['ideation', 'structure', 'writing'] as const).map((phase) => {
            const phaseStages = getPhaseStages(phase);
            return (
              <div
                key={phase}
                className="rounded-xl border border-border/60 bg-card/50 overflow-hidden"
              >
                <div className="px-3 py-2 border-b border-border/60">
                  <span className="text-xs font-bold text-primary">
                    {PHASE_LABELS[phase]}
                  </span>
                </div>
                <div className="py-1">
                  {phaseStages.map((stage) => {
                    const Icon = stage.icon;
                    const done = completed.has(stage.key);
                    return (
                      <button
                        key={stage.key}
                        onClick={() => onStageChange(stage.key)}
                        className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-accent/50 transition-colors"
                      >
                        <Icon className="size-4 shrink-0 text-muted-foreground" />
                        <span className="flex-1 text-sm truncate text-foreground">
                          {stage.label}
                        </span>
                        {done && <Check className="size-3.5 text-primary shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ========== 创作风格面板 ==========
function StylePanel({
  book,
  onBookUpdate,
}: {
  book: IBookWork;
  onBookUpdate: (book: IBookWork) => void;
}) {
  const [category, setCategory] = useState(book.category);
  const [stylePrompt, setStylePrompt] = useState(book.styleDescription || '');

  const handleSave = () => {
    const updated = { ...book, category, styleDescription: stylePrompt };
    saveBookOptimistic(updated, onBookUpdate);
    toast.success('风格设置已保存');
  };

  return (
    <div className="h-full flex flex-col">
      <div className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
        <Palette className="size-4 text-primary" />
        风格设置
      </div>
      <div className="flex-1 overflow-y-auto space-y-4 pr-1">
        <div className="space-y-2">
          <Label className="text-xs font-medium">分类</Label>
          <Select value={category} onValueChange={(v: 'male' | 'female') => setCategory(v)}>
            <SelectTrigger className="h-9 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="male">男频</SelectItem>
              <SelectItem value="female">女频</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-medium">风格提示</Label>
          <Textarea
            value={stylePrompt}
            onChange={(e) => setStylePrompt(e.target.value)}
            placeholder="描述你想要的创作风格，例如：华丽唯美的古风叙事、节奏紧凑的悬疑感、轻松幽默的现代语气..."
            className="min-h-[100px] resize-none bg-background/60 text-sm"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-medium">文风预设</Label>
          <div className="flex gap-1.5 flex-wrap">
            {STYLE_PRESETS.map((s) => (
              <button
                key={s}
                onClick={() => setStylePrompt(s)}
                className={cn(
                  'px-2.5 py-1 rounded-full text-xs transition-colors',
                  stylePrompt === s
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-background/60 border border-border/60 text-foreground hover:border-primary/40'
                )}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <Button
          onClick={handleSave}
          size="sm"
          className="w-full bg-gradient-to-r from-primary to-emerald-500 text-primary-foreground"
        >
          <Check className="size-3.5 mr-1.5" />
          保存风格设置
        </Button>

        <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 text-xs text-muted-foreground leading-relaxed">
          <p className="text-primary font-medium mb-1">使用说明</p>
          <p>
            分类与风格提示会作为「生成风格指南」的输入。点击中间区域的「生成风格指南」按钮，AI 将生成详细的创作风格指南文本。
          </p>
        </div>

        {book.styleGuide && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium">已生成风格指南</Label>
              <Badge variant="outline" className="text-[10px] h-5">
                {book.styleGuide.length} 字
              </Badge>
            </div>
            <div className="max-h-[120px] overflow-y-auto rounded-lg border border-border/60 bg-background/40 p-2 text-xs text-muted-foreground">
              {book.styleGuide.slice(0, 300)}...
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ========== 故事梗概面板 ==========
function SynopsisPanel({
  book,
  onBookUpdate,
}: {
  book: IBookWork;
  onBookUpdate: (book: IBookWork) => void;
}) {
  const [creativeIdeas, setCreativeIdeas] = useState('');
  const [existingSynopsis, setExistingSynopsis] = useState('');
  const [isImportMode, setIsImportMode] = useState(false);

  return (
    <div className="h-full flex flex-col">
      <div className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
        <Lightbulb className="size-4 text-primary" />
        梗概生成面板
      </div>
      <div className="flex-1 overflow-y-auto space-y-4 pr-1">
        <div className="space-y-2">
          <Label className="text-xs font-medium">创意补充</Label>
          <Textarea
            value={creativeIdeas}
            onChange={(e) => setCreativeIdeas(e.target.value)}
            placeholder="输入你的创意想法、核心设定、灵感碎片..."
            className="min-h-[80px] resize-none bg-background/60 text-sm"
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-medium">参考文档</Label>
            <Button variant="ghost" size="sm" className="h-6 text-xs">
              <Upload className="size-3 mr-1" />
              上传
            </Button>
          </div>
          <div className="rounded-lg border border-dashed border-border/70 p-3 text-center text-xs text-muted-foreground">
            支持 .txt / .md 格式，上传后作为生成参考
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-medium">导入已有梗概</Label>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-xs"
              onClick={() => setIsImportMode(!isImportMode)}
            >
              {isImportMode ? '收起' : '展开'}
            </Button>
          </div>
          {isImportMode && (
            <Textarea
              value={existingSynopsis}
              onChange={(e) => setExistingSynopsis(e.target.value)}
              placeholder="粘贴已有的故事梗概，AI 将在此基础上优化完善..."
              className="min-h-[80px] resize-none bg-background/60 text-sm"
            />
          )}
        </div>

        <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 text-xs text-muted-foreground leading-relaxed">
          <p className="text-primary font-medium mb-1">生成提示</p>
          <p>
            创意补充越具体，生成的梗概越贴合你的想法。点击中间「生成故事梗概」按钮开始创作。
          </p>
        </div>

        {book.synopsis && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium">已有梗概</Label>
              <Badge variant="outline" className="text-[10px] h-5">
                {book.synopsis.length} 字
              </Badge>
            </div>
            <div className="max-h-[150px] overflow-y-auto rounded-lg border border-border/60 bg-background/40 p-2 text-xs text-muted-foreground whitespace-pre-wrap">
              {book.synopsis.slice(0, 400)}...
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ========== 书名生成面板 ==========
function TitlesPanel({
  book,
  onBookUpdate,
}: {
  book: IBookWork;
  onBookUpdate: (book: IBookWork) => void;
}) {
  const [genreKeyword, setGenreKeyword] = useState(book.genre || '');
  const [stylePreference, setStylePreference] = useState(book.writingStyle || '');
  const [candidateCount, setCandidateCount] = useState(10);

  return (
    <div className="h-full flex flex-col">
      <div className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
        <BookMarked className="size-4 text-primary" />
        书名偏好
      </div>
      <div className="flex-1 overflow-y-auto space-y-4 pr-1">
        <div className="space-y-2">
          <Label className="text-xs font-medium">题材关键词</Label>
          <Input
            value={genreKeyword}
            onChange={(e) => setGenreKeyword(e.target.value)}
            placeholder="如：玄幻修仙、都市言情、悬疑推理..."
            className="h-9 text-sm bg-background/60"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-medium">风格偏好</Label>
          <div className="flex gap-1.5 flex-wrap">
            {['霸气热血', '诗意唯美', '简洁有力', '悬念感强', '轻松诙谐', '深沉厚重'].map((s) => (
              <button
                key={s}
                onClick={() => setStylePreference(s)}
                className={cn(
                  'px-2.5 py-1 rounded-full text-xs transition-colors',
                  stylePreference === s
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-background/60 border border-border/60 text-foreground hover:border-primary/40'
                )}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-medium">候选数量</Label>
          <div className="flex gap-1.5">
            {[5, 10, 15, 20].map((n) => (
              <button
                key={n}
                onClick={() => setCandidateCount(n)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex-1',
                  candidateCount === n
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-background/60 border border-border/60 text-foreground hover:border-primary/40'
                )}
              >
                {n} 个
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 text-xs text-muted-foreground leading-relaxed">
          <p className="text-primary font-medium mb-1">生成提示</p>
          <p>
            调整风格偏好和候选数量后，点击中间区域的「生成书名」按钮，AI 将为你推荐符合调性的书名候选。
          </p>
        </div>

        {book.titleCandidates && book.titleCandidates.length > 0 && (
          <div className="space-y-2">
            <Label className="text-xs font-medium">已有候选 ({book.titleCandidates.length})</Label>
            <div className="max-h-[120px] overflow-y-auto space-y-1">
              {book.titleCandidates.slice(0, 6).map((t, i) => (
                <div
                  key={i}
                  className={cn(
                    'px-2.5 py-1.5 rounded-lg text-xs border border-border/60',
                    book.title === t ? 'bg-primary/10 border-primary/30 text-primary' : 'bg-background/40 text-foreground'
                  )}
                >
                  {t}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ========== 内容简介面板 ==========
function BlurbPanel({
  book,
  onBookUpdate,
}: {
  book: IBookWork;
  onBookUpdate: (book: IBookWork) => void;
}) {
  const [wordCount, setWordCount] = useState(book.blurbWordCount || '300');
  const [focus, setFocus] = useState<string[]>(
    book.blurbFocus ? book.blurbFocus.split(',').filter(Boolean) : ['plot']
  );
  const [isGenerating, setIsGenerating] = useState(false);

  // 字数变化 → 同步到 book
  const handleWordCountChange = (n: string) => {
    setWordCount(n);
    const updated = { ...book, blurbWordCount: n };
    onBookUpdate(updated);
  };

  // 卖点切换（多选）→ 同步到 book
  const toggleFocus = (value: string) => {
    let next: string[];
    if (focus.includes(value)) {
      next = focus.filter((f) => f !== value);
      if (next.length === 0) next = ['plot']; // 至少保留一个
    } else {
      next = [...focus, value];
    }
    setFocus(next);
    const updated = { ...book, blurbFocus: next.join(',') };
    onBookUpdate(updated);
  };

  // 直接触发生成
  const handleGenerate = async () => {
    if (!book.synopsis?.trim() && !book.styleDescription?.trim()) {
      toast.warning('请先填写故事梗概或风格提示');
      return;
    }
    setIsGenerating(true);
    try {
      const { generateBlurb: genBlurb } = await import('@/lib/novel-generator');
      const full = await genBlurb(
        book.genre,
        book.title,
        book.synopsis || book.styleDescription || '',
        () => {}, // 面板不展示流式结果，由左侧 BlurbStage 展示
        {
          wordCount,
          focus: focus.join(','),
        }
      );
      const updated = { ...book, blurb: full, blurbWordCount: wordCount, blurbFocus: focus.join(',') };
      const saved = await saveBookOptimistic(updated, onBookUpdate, { silent: true });
      if (saved) {
        toast.success('内容简介生成完成，已自动保存');
      } else {
        toast.warning('简介已生成，但保存失败');
      }
    } catch {
      // error handled by toast
    } finally {
      setIsGenerating(false);
    }
  };

  const focusOptions = [
    { value: 'plot', label: '剧情冲突', desc: '突出悬念、转折与张力' },
    { value: 'character', label: '人物魅力', desc: '突出主角性格与成长' },
    { value: 'world', label: '世界观设定', desc: '突出独特的背景设定' },
    { value: 'emotion', label: '情感共鸣', desc: '突出情感关系与共情点' },
  ];

  return (
    <div className="h-full flex flex-col">
      <div className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
        <ScrollText className="size-4 text-primary" />
        简介参数
      </div>
      <div className="flex-1 overflow-y-auto space-y-4 pr-1">
        <div className="space-y-2">
          <Label className="text-xs font-medium">简介字数</Label>
          <div className="flex gap-1.5">
            {['100', '200', '300', '500'].map((n) => (
              <button
                key={n}
                onClick={() => handleWordCountChange(n)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex-1',
                  wordCount === n
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-background/60 border border-border/60 text-foreground hover:border-primary/40'
                )}
              >
                {n}字
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-medium">卖点侧重（可多选）</Label>
            <span className="text-[10px] text-muted-foreground">已选 {focus.length} 项</span>
          </div>
          <div className="space-y-1.5">
            {focusOptions.map((item) => {
              const active = focus.includes(item.value);
              return (
                <button
                  key={item.value}
                  onClick={() => toggleFocus(item.value)}
                  className={cn(
                    'w-full px-3 py-2 rounded-lg text-left transition-colors border',
                    active
                      ? 'bg-primary/10 border-primary/30 text-foreground'
                      : 'bg-background/40 border-border/60 text-foreground hover:border-primary/40'
                  )}
                >
                  <div className="flex items-center gap-2">
                    {active && <Check className="size-3.5 text-primary shrink-0" />}
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium">{item.label}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{item.desc}</div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* 生成按钮 */}
        <Button
          onClick={handleGenerate}
          disabled={isGenerating}
          className="w-full bg-gradient-to-r from-primary to-emerald-500 text-primary-foreground shadow-md shadow-primary/20"
        >
          <Sparkles className="size-4 mr-2" />
          {isGenerating ? '生成中...' : '生成内容简介'}
        </Button>

        <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 text-xs text-muted-foreground leading-relaxed">
          <p className="text-primary font-medium mb-1">生成提示</p>
          <p>
            内容简介是吸引读者的关键。建议先完成故事梗概，再生成简介效果更佳。
          </p>
        </div>

        {book.blurb && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium">已有简介</Label>
              <Badge variant="outline" className="text-[10px] h-5">
                {book.blurb.length} 字
              </Badge>
            </div>
            <div className="max-h-[150px] overflow-y-auto rounded-lg border border-border/60 bg-background/40 p-2 text-xs text-muted-foreground whitespace-pre-wrap">
              {book.blurb}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ========== 详细大纲面板 ==========
function OutlinePanel({
  book,
  onBookUpdate,
}: {
  book: IBookWork;
  onBookUpdate: (book: IBookWork) => void;
}) {
  const [volumeCount, setVolumeCount] = useState(
    book.volumes && book.volumes.length > 0 ? book.volumes.length : 3
  );
  const [isCustomVolumes, setIsCustomVolumes] = useState(false);
  const [customVolumeCount, setCustomVolumeCount] = useState('');
  const [chapterPresetIdx, setChapterPresetIdx] = useState(1);
  const [isCustomChapters, setIsCustomChapters] = useState(false);
  const [customChapterCount, setCustomChapterCount] = useState('');
  const [extraReq, setExtraReq] = useState('');
  const [plotDirection, setPlotDirection] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [selectedNodes, setSelectedNodes] = useState<string[]>([]);

  const VOLUME_PRESETS = [2, 3, 4, 5];
  const VOLUME_MIN = 1;
  const VOLUME_MAX = 20;
  const CHAPTER_PRESETS = [
    { label: '精简', count: 6 },
    { label: '标准', count: 10 },
    { label: '适中', count: 14 },
    { label: '丰富', count: 20 },
  ];
  const CHAPTER_MIN = 1;
  const CHAPTER_MAX = 30;
  const PLOT_NODES = ['开局悬念', '主角登场', '第一冲突', '世界观展开', '中期转折', '高潮对决', '结局收束'];

  const effectiveVolumeCount = useMemo(() => {
    if (isCustomVolumes) {
      const n = parseInt(customVolumeCount, 10);
      if (isNaN(n) || n < VOLUME_MIN) return VOLUME_MIN;
      if (n > VOLUME_MAX) return VOLUME_MAX;
      return n;
    }
    return volumeCount;
  }, [isCustomVolumes, customVolumeCount, volumeCount]);

  const chaptersPerVolume = useMemo(() => {
    if (isCustomChapters) {
      const n = parseInt(customChapterCount, 10);
      if (isNaN(n) || n < CHAPTER_MIN) return CHAPTER_MIN;
      if (n > CHAPTER_MAX) return CHAPTER_MAX;
      return n;
    }
    return CHAPTER_PRESETS[chapterPresetIdx].count;
  }, [isCustomChapters, chapterPresetIdx, customChapterCount]);

  const toggleNode = (node: string) => {
    setSelectedNodes((prev) =>
      prev.includes(node) ? prev.filter((n) => n !== node) : [...prev, node]
    );
  };

  const handleGenerate = async () => {
    if (!book.synopsis?.trim()) {
      toast.warning('请先完成故事梗概');
      return;
    }
    setIsGenerating(true);
    try {
      let full = '';
      const plotParts = [plotDirection.trim(), extraReq.trim()]
        .filter(Boolean)
        .concat(selectedNodes.length > 0 ? [`建议包含以下情节节点：${selectedNodes.join('、')}`] : []);
      await generateOutline(
        book.genre,
        book.title || '未命名作品',
        book.synopsis,
        book.styleGuide || '',
        (piece) => {
          full += piece;
        },
        {
          volumeCount: effectiveVolumeCount,
          chaptersPerVolume,
          plotDirection: plotParts.length > 0 ? plotParts.join('\n\n') : undefined,
        }
      );
      const updated = { ...book, outline: full };
      const saved = await saveBookOptimistic(updated, onBookUpdate, { silent: true });
      const vols = parseOutlineText(full);
      if (saved) {
        toast.success(`生成了 ${vols.length || effectiveVolumeCount} 卷大纲，已自动保存`);
      } else {
        toast.warning('大纲已生成，但保存失败');
      }
    } catch {
      // 错误已在生成函数中处理
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSyncToVolumes = async () => {
    if (!book.outline?.trim()) {
      toast.warning('请先生成详细大纲');
      return;
    }
    const vols = parseOutlineText(book.outline);
    if (vols.length === 0) {
      toast.error('大纲格式无法解析为卷结构，请重新生成');
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

      for (let v = 0; v < vols.length; v++) {
        const vol = vols[v];
        const volumeId = `vol_${v}_${ts}`;
        const volChapters: IChapter[] = [];

        for (let i = 0; i < vol.chapters.length; i++) {
          const ch = vol.chapters[i];
          const newTitle = ch.title || `第${i + 1}章`;
          const normNew = normTitle(newTitle);
          let matched: IChapter | undefined;

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
      logger.error('[OutlinePanel] sync failed:', String(error));
      toast.error('同步到卷管理失败，请重试');
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
        <ListOrdered className="size-4 text-primary" />
        大纲参数
      </div>
      <div className="flex-1 overflow-y-auto space-y-4 pr-1">
        <div className="space-y-2">
          <Label className="text-xs font-medium">卷数规划</Label>
          <div className="flex gap-1.5">
            {VOLUME_PRESETS.map((n) => (
              <button
                key={n}
                onClick={() => {
                  setVolumeCount(n);
                  setIsCustomVolumes(false);
                }}
                disabled={isGenerating}
                className={cn(
                  'px-2 py-1.5 rounded-lg text-xs font-medium transition-colors flex-1 border',
                  !isCustomVolumes && volumeCount === n
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-background/60 border-border/60 text-foreground hover:border-primary/40'
                )}
              >
                {n}卷
              </button>
            ))}
          </div>
          {!isCustomVolumes ? (
            <button
              onClick={() => {
                setIsCustomVolumes(true);
                setCustomVolumeCount(String(effectiveVolumeCount));
              }}
              disabled={isGenerating}
              className="w-full px-2 py-1.5 rounded-lg text-xs text-left text-muted-foreground hover:text-foreground border border-dashed border-border/60 hover:border-primary/40 transition-colors"
            >
              + 自定义卷数
            </button>
          ) : (
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5">
                <Input
                  type="number"
                  value={customVolumeCount}
                  onChange={(e) => setCustomVolumeCount(e.target.value)}
                  placeholder="卷数"
                  className="h-8 text-sm bg-background/60"
                  disabled={isGenerating}
                  min={VOLUME_MIN}
                  max={VOLUME_MAX}
                />
                <span className="text-xs text-muted-foreground">卷</span>
              </div>
              <div className="flex items-center justify-between px-0.5">
                <span className="text-[10px] text-muted-foreground">
                  范围 {VOLUME_MIN}-{VOLUME_MAX} 卷
                </span>
                <button
                  onClick={() => setIsCustomVolumes(false)}
                  disabled={isGenerating}
                  className="px-2 py-0.5 rounded text-[10px] text-muted-foreground hover:text-foreground"
                >
                  恢复预设
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-medium">每卷章节数</Label>
          <div className="grid grid-cols-2 gap-1.5">
            {CHAPTER_PRESETS.map((p, idx) => (
              <button
                key={p.label}
                onClick={() => {
                  setChapterPresetIdx(idx);
                  setIsCustomChapters(false);
                }}
                disabled={isGenerating}
                className={cn(
                  'px-2 py-1.5 rounded-lg text-xs text-left transition-colors border',
                  !isCustomChapters && chapterPresetIdx === idx
                    ? 'bg-primary/10 border-primary/30 text-foreground'
                    : 'bg-background/60 border-border/60 text-foreground hover:border-primary/40'
                )}
              >
                <div className="font-medium">{p.label}</div>
                <div className="text-[10px] text-muted-foreground">每卷 {p.count} 章</div>
              </button>
            ))}
            <button
              onClick={() => {
                setIsCustomChapters(true);
                setCustomChapterCount(String(chaptersPerVolume));
              }}
              disabled={isGenerating}
              className="px-2 py-1.5 rounded-lg text-xs text-left text-muted-foreground hover:text-foreground border border-dashed border-border/60 hover:border-primary/40 transition-colors col-span-2"
            >
              + 自定义章节数
            </button>
          </div>
          {isCustomChapters && (
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center gap-1.5">
                <Input
                  type="number"
                  value={customChapterCount}
                  onChange={(e) => setCustomChapterCount(e.target.value)}
                  placeholder="章数"
                  className="h-8 text-sm bg-background/60"
                  disabled={isGenerating}
                  min={CHAPTER_MIN}
                  max={CHAPTER_MAX}
                />
                <span className="text-xs text-muted-foreground">章 / 卷</span>
              </div>
              <div className="flex items-center justify-between px-0.5">
                <span className="text-[10px] text-muted-foreground">
                  范围 {CHAPTER_MIN}-{CHAPTER_MAX} 章
                </span>
                <button
                  onClick={() => setIsCustomChapters(false)}
                  disabled={isGenerating}
                  className="px-2 py-0.5 rounded text-[10px] text-muted-foreground hover:text-foreground"
                >
                  恢复预设
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-medium">剧情大概走向</Label>
          <Textarea
            value={plotDirection}
            onChange={(e) => setPlotDirection(e.target.value)}
            placeholder="描述故事的整体走向、关键转折、高潮位置、结局基调..."
            className="min-h-[70px] resize-none bg-background/60 text-sm"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-medium">关键情节偏好</Label>
          <Textarea
            value={extraReq}
            onChange={(e) => setExtraReq(e.target.value)}
            placeholder="希望大纲包含哪些关键情节节点、转折、高潮位置偏好..."
            className="min-h-[60px] resize-none bg-background/60 text-sm"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-medium">情节节点参考（可选）</Label>
          <div className="grid grid-cols-2 gap-1.5">
            {PLOT_NODES.map((n) => {
              const active = selectedNodes.includes(n);
              return (
                <button
                  key={n}
                  onClick={() => toggleNode(n)}
                  disabled={isGenerating}
                  className={cn(
                    'px-2 py-1.5 rounded-lg text-xs text-left transition-colors border flex items-center gap-1.5',
                    active
                      ? 'bg-primary/10 border-primary/30 text-foreground'
                      : 'bg-background/60 border-border/60 text-muted-foreground hover:border-primary/40 hover:text-foreground'
                  )}
                >
                  <div
                    className={cn(
                      'size-3.5 rounded border flex items-center justify-center shrink-0',
                      active ? 'bg-primary border-primary text-primary-foreground' : 'border-border/60'
                    )}
                  >
                    {active && <Check className="size-2.5" />}
                  </div>
                  <span className="truncate">{n}</span>
                </button>
              );
            })}
          </div>
        </div>

        <Button
          onClick={handleGenerate}
          size="sm"
          disabled={isGenerating}
          className="w-full bg-gradient-to-r from-primary to-emerald-500 text-primary-foreground"
        >
          {isGenerating ? (
            <>
              <RefreshCw className="size-3.5 mr-1 animate-spin" />
              生成中...
            </>
          ) : (
            <>
              <Sparkles className="size-3.5 mr-1" />
              {book.outline ? '重新生成' : '开始生成'}
            </>
          )}
        </Button>

        {book.outline && (
          <Button
            onClick={handleSyncToVolumes}
            size="sm"
            variant="outline"
            disabled={isSyncing}
            className="w-full border-primary/30 text-primary hover:bg-primary/5"
          >
            {isSyncing ? (
              <>
                <RefreshCw className="size-3.5 mr-1 animate-spin" />
                同步中...
              </>
            ) : (
              <>
                <ArrowRight className="size-3.5 mr-1" />
                同步到卷管理
              </>
            )}
          </Button>
        )}

        <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 text-xs text-muted-foreground leading-relaxed">
          <p className="text-primary font-medium mb-1">生成提示</p>
          <p>
            详细大纲是故事的骨架。建议先完成故事梗概和人物小传，再生成大纲。生成的大纲可在「卷管理」中进一步细化。
          </p>
        </div>

        {book.outline && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium">已有大纲</Label>
              <Badge variant="outline" className="text-[10px] h-5">
                {book.outline.length} 字
              </Badge>
            </div>
            <div className="max-h-[180px] overflow-y-auto rounded-lg border border-border/60 bg-background/40 p-2 text-xs text-muted-foreground whitespace-pre-wrap">
              {book.outline.slice(0, 500)}...
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ========== 人物管理面板 ==========
function CharactersPanel({
  book,
  onBookUpdate,
}: {
  book: IBookWork;
  onBookUpdate: (book: IBookWork) => void;
}) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingChar, setEditingChar] = useState<ICharacterProfile | null>(null);
  const [isAiGenerating, setIsAiGenerating] = useState(false);

  const characters = book.characterProfiles || [];

  const handleAdd = () => {
    setEditingChar({
      id: `char_new_${Date.now()}`,
      name: '',
      identity: '',
      gender: 'male',
      personality: '',
      background: '',
      relationships: '',
      characterArc: '',
      keyTraits: '',
      extraFields: [],
    });
    setDialogOpen(true);
  };

  const handleEdit = (char: ICharacterProfile) => {
    setEditingChar({ ...char, extraFields: char.extraFields || [] });
    setDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    const updated = {
      ...book,
      characterProfiles: characters.filter((c) => c.id !== id),
    };
    saveBookOptimistic(updated, onBookUpdate);
    toast.success('已删除人物');
  };

  const handleMove = (idx: number, dir: 'up' | 'down') => {
    const newIdx = dir === 'up' ? idx - 1 : idx + 1;
    if (newIdx < 0 || newIdx >= characters.length) return;
    const arr = [...characters];
    [arr[idx], arr[newIdx]] = [arr[newIdx], arr[idx]];
    const updated = { ...book, characterProfiles: arr };
    saveBookOptimistic(updated, onBookUpdate);
  };

  const handleSaveCharacter = (char: ICharacterProfile) => {
    let updatedChars: ICharacterProfile[];
    const exists = characters.some((c) => c.id === char.id);
    if (exists) {
      updatedChars = characters.map((c) => (c.id === char.id ? char : c));
    } else {
      updatedChars = [...characters, char];
    }
    const updated = { ...book, characterProfiles: updatedChars };
    saveBookOptimistic(updated, onBookUpdate);
    setDialogOpen(false);
    setEditingChar(null);
    toast.success(exists ? '人物已更新' : '人物已添加');
  };

  const handleAiGenerate = async () => {
    if (!book.synopsis?.trim() && !book.styleDescription?.trim()) {
      toast.warning('请先填写故事梗概或风格提示');
      return;
    }
    setIsAiGenerating(true);
    try {
      const result = await generateCharacterProfiles(
        book.genre,
        book.title,
        book.synopsis,
        book.outline || '',
        () => {},
        book.styleGuide || book.styleDescription || ''
      );
      if (result.length === 0) {
        toast.error('人物小传解析失败，请重新生成');
      } else {
        const updated = { ...book, characterProfiles: result };
        const saved = await saveBookOptimistic(updated, onBookUpdate, { silent: true });
        if (saved) {
          toast.success(`AI 生成了 ${result.length} 位人物小传，已自动保存`);
        } else {
          toast.warning('人物小传已生成，但保存失败');
        }
      }
    } catch {
      toast.error('生成失败，请稍后重试');
    } finally {
      setIsAiGenerating(false);
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Users className="size-4 text-primary" />
          人物管理
        </div>
        <Button size="sm" onClick={handleAdd} className="h-7 text-xs">
          <Plus className="size-3.5 mr-1" />
          添加人物
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto space-y-2 pr-1">
        {/* AI 批量生成入口 */}
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 mb-1">
          <p className="text-xs text-foreground mb-2 font-medium flex items-center gap-1.5">
            <Sparkles className="size-3.5 text-primary" />
            AI 批量生成人物小传
          </p>
          <p className="text-[11px] text-muted-foreground mb-2.5 leading-relaxed">
            基于故事梗概与大纲，自动生成主要人物的性格、背景、关系与成长弧光。
          </p>
          <Button
            size="sm"
            onClick={handleAiGenerate}
            disabled={isAiGenerating || !book.synopsis?.trim()}
            className="w-full bg-gradient-to-r from-primary to-emerald-500 text-primary-foreground h-8"
          >
            <Sparkles className={`size-3.5 mr-1 ${isAiGenerating ? 'animate-spin' : ''}`} />
            {isAiGenerating
              ? '生成中...'
              : characters.length > 0
                ? '重新生成人物'
                : '开始生成人物'}
          </Button>
        </div>

        {characters.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground text-xs">
            <Users className="size-8 mx-auto mb-2 opacity-40" />
            <p>暂无人物</p>
            <p className="text-[11px] mt-1">可点击上方 AI 生成，或手动添加</p>
          </div>
        ) : (
          characters.map((char, idx) => (
            <motion.div
              key={char.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className="group rounded-lg border border-border/60 bg-card/50 p-2.5 hover:border-primary/30 transition-all"
            >
              <div className="flex items-start gap-2">
                <div className="size-7 rounded-full bg-primary/15 flex items-center justify-center text-primary text-xs font-bold shrink-0">
                  {char.name?.charAt(0) || '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-medium text-foreground truncate">
                      {char.name || '未命名'}
                    </span>
                    {char.identity && (
                      <Badge variant="outline" className="text-[10px] h-4 px-1">
                        {char.identity}
                      </Badge>
                    )}
                  </div>
                  {char.personality && (
                    <div className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">
                      {char.personality}
                    </div>
                  )}
                  {char.keyTraits && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {char.keyTraits.split(/[，,、\s]+/).filter(Boolean).slice(0, 3).map((t, i) => (
                        <span
                          key={i}
                          className="px-1.5 py-0.5 rounded-full bg-primary/10 text-primary text-[10px]"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleMove(idx, 'up')}
                    disabled={idx === 0}
                    className="p-0.5 rounded hover:bg-accent text-muted-foreground disabled:opacity-30"
                  >
                    <ChevronUp className="size-3" />
                  </button>
                  <button
                    onClick={() => handleMove(idx, 'down')}
                    disabled={idx === characters.length - 1}
                    className="p-0.5 rounded hover:bg-accent text-muted-foreground disabled:opacity-30"
                  >
                    <ChevronDown className="size-3" />
                  </button>
                </div>
                <div className="flex items-center gap-0.5">
                  <button
                    onClick={() => handleEdit(char)}
                    className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground"
                  >
                    <Edit2 className="size-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(char.id)}
                    className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))
        )}

        <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 text-xs text-muted-foreground leading-relaxed mt-3">
          <p className="text-primary font-medium mb-1">关于人物设定</p>
          <p>
            人物的性格、关键经历与设定会作为上下文注入正文生成，AI 将确保人物言行符合其性格与背景。
          </p>
        </div>
      </div>

      {/* 人物编辑对话框 */}
      <CharacterEditDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        character={editingChar}
        onSave={handleSaveCharacter}
      />
    </div>
  );
}

// ========== 人物编辑 Dialog ==========
function CharacterEditDialog({
  open,
  onOpenChange,
  character,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  character: ICharacterProfile | null;
  onSave: (char: ICharacterProfile) => void;
}) {
  const [form, setForm] = useState<ICharacterProfile>(character || {
    id: '',
    name: '',
  });
  const [extraFields, setExtraFields] = useState<ICharacterExtraField[]>(character?.extraFields || []);

  useEffect(() => {
    if (character) {
      setForm(character);
      setExtraFields(character.extraFields || []);
    }
  }, [character?.id]);

  if (!character) return null;

  const update = (key: keyof ICharacterProfile, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = () => {
    if (!form.name.trim()) {
      toast.warning('请输入人物姓名');
      return;
    }
    onSave({ ...form, extraFields });
  };

  const addExtra = () => {
    setExtraFields([...extraFields, { key: `extra_${Date.now()}`, label: '', value: '' }]);
  };

  const removeExtra = (key: string) => {
    setExtraFields(extraFields.filter((f) => f.key !== key));
  };

  const updateExtra = (key: string, field: 'label' | 'value', value: string) => {
    setExtraFields(extraFields.map((f) => (f.key === key ? { ...f, [field]: value } : f)));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{form.name ? '编辑人物' : '添加人物'}</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto space-y-3 -mx-6 px-6 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">姓名 *</Label>
              <Input
                value={form.name}
                onChange={(e) => update('name', e.target.value)}
                className="h-9 text-sm"
                placeholder="人物姓名"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">身份/职业</Label>
              <Input
                value={form.identity || ''}
                onChange={(e) => update('identity', e.target.value)}
                className="h-9 text-sm"
                placeholder="如：主角、反派、剑仙..."
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">性别</Label>
            <div className="flex gap-2">
              {['male', 'female', 'other'].map((g) => (
                <button
                  key={g}
                  onClick={() => update('gender', g as 'male' | 'female' | 'other')}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-xs flex-1 border transition-colors',
                    form.gender === g
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background border-border/60 text-foreground hover:border-primary/40'
                  )}
                >
                  {g === 'male' ? '男' : g === 'female' ? '女' : '其他'}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">性格特点</Label>
            <Input
              value={form.personality || ''}
              onChange={(e) => update('personality', e.target.value)}
              className="h-9 text-sm"
              placeholder="如：外冷内热、聪慧果断、乐观开朗..."
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">关键经历与性格关键词</Label>
            <Textarea
              value={form.keyTraits || ''}
              onChange={(e) => update('keyTraits', e.target.value)}
              className="min-h-[60px] resize-none text-sm"
              placeholder="填入影响人物行为的关键经历和性格标签，正文生成时将严格参考"
            />
            <p className="text-[10px] text-muted-foreground">
              这些关键词会作为正文生成的强约束，确保人物言行一致
            </p>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">背景经历</Label>
            <Textarea
              value={form.background || ''}
              onChange={(e) => update('background', e.target.value)}
              className="min-h-[60px] resize-none text-sm"
              placeholder="人物的出身、成长经历、重要事件..."
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">与其他人物关系</Label>
            <Textarea
              value={form.relationships || ''}
              onChange={(e) => update('relationships', e.target.value)}
              className="min-h-[50px] resize-none text-sm"
              placeholder="如：与 XX 是师徒关系，与 XX 是宿敌..."
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">成长弧光</Label>
            <Textarea
              value={form.characterArc || ''}
              onChange={(e) => update('characterArc', e.target.value)}
              className="min-h-[50px] resize-none text-sm"
              placeholder="人物在故事中的成长与变化轨迹"
            />
          </div>

          {/* 自定义字段 */}
          {extraFields.length > 0 && (
            <div className="space-y-2">
              <Label className="text-xs">自定义字段</Label>
              {extraFields.map((field) => (
                <div key={field.key} className="flex gap-2 items-start">
                  <Input
                    value={field.label}
                    onChange={(e) => updateExtra(field.key, 'label', e.target.value)}
                    placeholder="字段名"
                    className="h-8 text-xs w-24 shrink-0"
                  />
                  <Input
                    value={field.value}
                    onChange={(e) => updateExtra(field.key, 'value', e.target.value)}
                    placeholder="字段值"
                    className="h-8 text-xs flex-1"
                  />
                  <button
                    onClick={() => removeExtra(field.key)}
                    className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive shrink-0"
                  >
                    <X className="size-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={addExtra}
            className="w-full h-8 text-xs border-dashed"
          >
            <Plus className="size-3.5 mr-1" />
            添加自定义字段
          </Button>
        </div>
        <DialogFooter className="pt-3 border-t border-border/60">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button
            onClick={handleSubmit}
            className="bg-gradient-to-r from-primary to-emerald-500 text-primary-foreground"
          >
            <Check className="size-4 mr-1.5" />
            保存
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ========== 卷管理面板 ==========
function VolumesPanel({
  book,
  onBookUpdate,
  onSync,
}: {
  book: IBookWork;
  onBookUpdate: (book: IBookWork) => void;
  onSync?: () => void;
}) {
  const volumes = book.volumes || [];

  const handleAddChapterToVolume = (volId: string) => {
    const title = prompt('请输入章节名称：');
    if (!title) return;
    const now = Date.now();
    const newChapter: IChapter = {
      id: `ch_${now}`,
      title,
      summary: '',
      wordCount: 0,
      content: '',
      createdAt: now,
      updatedAt: now,
      status: 'draft',
      volumeId: volId,
    };
    const updatedVolumes = volumes.map((v) =>
      v.id === volId ? { ...v, chapterCount: v.chapterCount + 1, updatedAt: now } : v
    );
    const updated = {
      ...book,
      volumes: updatedVolumes,
      chapters: [...book.chapters, newChapter],
    };
    saveBookOptimistic(updated, onBookUpdate);
  };

  const handleEditVolumeTitle = (vol: IVolume) => {
    const newTitle = prompt('编辑卷名：', vol.title);
    if (!newTitle) return;
    const updated = {
      ...book,
      volumes: volumes.map((v) =>
        v.id === vol.id ? { ...v, title: newTitle, updatedAt: Date.now() } : v
      ),
    };
    saveBookOptimistic(updated, onBookUpdate);
  };

  const handleDeleteVolume = (volId: string) => {
    if (!confirm('确认删除该卷及其内章节？')) return;
    const updated = {
      ...book,
      volumes: volumes.filter((v) => v.id !== volId),
      chapters: book.chapters.filter((c) => c.volumeId !== volId),
    };
    saveBookOptimistic(updated, onBookUpdate);
  };

  const handleSync = () => {
    if (volumes.length === 0) {
      toast.warning('还没有卷结构，请先生成或手动添加');
      return;
    }
    onSync?.();
    toast.success('已同步到章节管理');
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Layers className="size-4 text-primary" />
          卷设置
        </div>
        <Badge variant="outline" className="text-[10px] h-5">
          {volumes.length} 卷
        </Badge>
      </div>

      <div className="flex-1 overflow-y-auto space-y-2 pr-1">
        {volumes.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-xs">
            <Layers className="size-8 mx-auto mb-2 opacity-40" />
            <p>暂无卷结构</p>
            <p className="text-[11px] mt-1">点击中间「AI 生成卷结构」或先选择卷数</p>
          </div>
        ) : (
          volumes.map((vol, volIdx) => {
            const volChapters = book.chapters.filter((c) => c.volumeId === vol.id);
            return (
              <div
                key={vol.id}
                className="rounded-lg border border-border/60 bg-card/50 overflow-hidden"
              >
                <div className="flex items-center justify-between px-2.5 py-2 bg-muted/30 border-b border-border/50">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-[11px] font-bold text-primary">第{volIdx + 1}卷</span>
                    <span className="text-sm font-medium text-foreground truncate">
                      {vol.title.replace(/^第[一二三四五六七八九十\d]+卷[·、\s]*/, '')}
                    </span>
                  </div>
                  <div className="flex items-center gap-0.5">
                    <button
                      onClick={() => handleEditVolumeTitle(vol)}
                      className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground"
                    >
                      <Edit2 className="size-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteVolume(vol.id)}
                      className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </div>
                <div className="p-2 space-y-1">
                  {volChapters.length === 0 ? (
                    <div className="text-[11px] text-muted-foreground text-center py-2">
                      暂无章节
                    </div>
                  ) : (
                    volChapters.map((ch, chIdx) => (
                      <div
                        key={ch.id}
                        className="flex items-center justify-between px-2 py-1 rounded hover:bg-background/60 text-xs group"
                      >
                        <span className="text-foreground truncate flex-1">
                          {chIdx + 1}. {ch.title}
                        </span>
                        <span className="text-[10px] text-muted-foreground ml-2 shrink-0">
                          {ch.wordCount}字
                        </span>
                      </div>
                    ))
                  )}
                  <button
                    onClick={() => handleAddChapterToVolume(vol.id)}
                    className="w-full px-2 py-1.5 rounded border border-dashed border-border/60 text-xs text-muted-foreground hover:border-primary/40 hover:text-primary hover:bg-primary/5 transition-all"
                  >
                    <Plus className="size-3 inline mr-1" />
                    添加章节
                  </button>
                </div>
              </div>
            );
          })
        )}

        <div className="pt-2">
          <Button
            onClick={handleSync}
            size="sm"
            className="w-full bg-gradient-to-r from-primary to-emerald-500 text-primary-foreground"
            disabled={volumes.length === 0}
          >
            <BookCopy className="size-4 mr-1.5" />
            一键同步到章节管理
          </Button>
          <p className="text-[10px] text-muted-foreground text-center mt-1.5">
            将卷结构与章节同步到「章节管理」列表
          </p>
        </div>

        <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 text-xs text-muted-foreground leading-relaxed mt-2">
          <p className="text-primary font-medium mb-1">使用说明</p>
          <p>
            可直接编辑卷名、在卷内增删章节。编辑完成后点击「一键同步到章节管理」，同步结果将进入章节列表。
          </p>
        </div>
      </div>
    </div>
  );
}

// ========== 章节管理面板 ==========
function ChaptersPanel({
  book,
  onBookUpdate,
}: {
  book: IBookWork;
  onBookUpdate: (book: IBookWork) => void;
}) {
  const chapters = book.chapters || [];
  const volumes = book.volumes || [];

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm font-semibold text-foreground flex items-center gap-2">
          <FileText className="size-4 text-primary" />
          章节列表
        </div>
        <Badge variant="outline" className="text-[10px] h-5">
          {chapters.length} 章
        </Badge>
      </div>

      <div className="flex-1 overflow-y-auto space-y-3 pr-1">
        {volumes.length > 0 ? (
          volumes.map((vol, volIdx) => {
            const volChapters = chapters.filter((c) => c.volumeId === vol.id);
            return (
              <div key={vol.id} className="space-y-1">
                <div className="flex items-center gap-2 px-1">
                  <span className="text-[11px] font-bold text-primary">第{volIdx + 1}卷</span>
                  <span className="text-[11px] text-muted-foreground truncate">
                    {vol.title.replace(/^第[一二三四五六七八九十\d]+卷[·、\s]*/, '')}
                  </span>
                </div>
                <div className="space-y-1">
                  {volChapters.length === 0 ? (
                    <div className="text-[11px] text-muted-foreground px-2 py-1.5">
                      暂无章节
                    </div>
                  ) : (
                    volChapters.map((ch, chIdx) => (
                      <div
                        key={ch.id}
                        className="flex items-center justify-between px-2 py-1.5 rounded-lg bg-card/50 border border-border/60 hover:border-primary/30 text-xs group"
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <span className="text-[10px] text-muted-foreground shrink-0 w-6">
                            {chIdx + 1}
                          </span>
                          <span className="text-foreground truncate">{ch.title}</span>
                        </div>
                        <span className="text-[10px] text-muted-foreground ml-2 shrink-0">
                          {ch.wordCount}字
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <div className="space-y-1">
            {chapters.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground text-xs">
                <FileText className="size-8 mx-auto mb-2 opacity-40" />
                <p>暂无章节</p>
                <p className="text-[11px] mt-1">
                  先生成卷结构或在卷管理中添加章节
                </p>
              </div>
            ) : (
              chapters.map((ch, idx) => (
                <div
                  key={ch.id}
                  className="flex items-center justify-between px-2.5 py-2 rounded-lg bg-card/50 border border-border/60 hover:border-primary/30 text-xs"
                >
                  <span className="text-foreground truncate flex-1">
                    {idx + 1}. {ch.title}
                  </span>
                  <span className="text-[10px] text-muted-foreground ml-2 shrink-0">
                    {ch.wordCount}字
                  </span>
                </div>
              ))
            )}
          </div>
        )}

        <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 text-xs text-muted-foreground leading-relaxed">
          <p className="text-primary font-medium mb-1">章节管理提示</p>
          <p>
            点击章节可进入正文创作。章节顺序在「卷管理」中调整，同步后生效。
          </p>
        </div>
      </div>
    </div>
  );
}

// ========== 正文生成面板 ==========
function BodyPanel({
  book,
  chapter,
  currentVolume,
}: {
  book: IBookWork;
  chapter?: IChapter;
  currentVolume?: IVolume;
}) {
  const [localTitle, setLocalTitle] = useState('');
  const [localSummary, setLocalSummary] = useState('');
  const [localWordCount, setLocalWordCount] = useState(3000);
  const [localStyle, setLocalStyle] = useState('');
  const [localInstruction, setLocalInstruction] = useState('');

  useEffect(() => {
    if (chapter) {
      setLocalTitle(chapter.title || '');
      setLocalSummary(chapter.summary || '');
      setLocalStyle(book.writingStyle || '');
      setLocalInstruction('');
    }
  }, [chapter?.id, book.writingStyle]);

  if (!chapter) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center p-6">
        <PenTool className="size-10 text-muted-foreground/30 mb-3" />
        <p className="text-sm text-muted-foreground">请从章节列表中选择章节</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="mb-3">
        <div className="text-sm font-semibold text-foreground truncate">{chapter.title}</div>
        <div className="text-xs text-muted-foreground mt-0.5">
          {currentVolume ? currentVolume.title : '独立章节'} · {chapter.wordCount} 字
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 pr-1">
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5 text-xs font-medium text-foreground">
            <Hash className="size-3.5 text-primary" />
            章节名称
          </div>
          <Input
            value={localTitle}
            onChange={(e) => setLocalTitle(e.target.value)}
            className="h-8 text-sm bg-background/60"
          />
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5 text-xs font-medium text-foreground">
            <FileText className="size-3.5 text-primary" />
            章节梗概
          </div>
          <Textarea
            value={localSummary}
            onChange={(e) => setLocalSummary(e.target.value)}
            className="min-h-[60px] resize-none bg-background/60 text-xs"
          />
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5 text-xs font-medium text-foreground">
            <Target className="size-3.5 text-primary" />
            目标字数
          </div>
          <div className="flex gap-1 flex-wrap">
            {WORD_COUNT_PRESETS.map((n) => (
              <button
                key={n}
                onClick={() => setLocalWordCount(n)}
                className={cn(
                  'px-2 py-0.5 rounded text-xs transition-colors',
                  localWordCount === n
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-background/60 border border-border/60 text-foreground hover:border-primary/40'
                )}
              >
                {n / 1000}k
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5 text-xs font-medium text-foreground">
            <Palette className="size-3.5 text-primary" />
            文风要求
          </div>
          <div className="flex gap-1 flex-wrap">
            {STYLE_PRESETS.map((s) => (
              <button
                key={s}
                onClick={() => setLocalStyle(s)}
                className={cn(
                  'px-2 py-0.5 rounded text-xs transition-colors',
                  localStyle === s
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-background/60 border border-border/60 text-foreground hover:border-primary/40'
                )}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5 text-xs font-medium text-foreground">
            <Sparkles className="size-3.5 text-primary" />
            创作指令
          </div>
          <Textarea
            value={localInstruction}
            onChange={(e) => setLocalInstruction(e.target.value)}
            className="min-h-[80px] resize-none bg-background/60 text-xs"
            placeholder="本章需要突出的情节、情感基调、特殊要求..."
          />
        </div>

        <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 text-xs text-muted-foreground leading-relaxed">
          <p className="text-primary font-medium mb-1">生成提示</p>
          <p>
            生成正文时会自动引用全书设定（风格指南、梗概、大纲、人物小传），确保内容与全书一致。
          </p>
        </div>
      </div>
    </div>
  );
}

// ========== 剧本生成面板 ==========
function ScriptPanel({
  book,
  chapter,
}: {
  book: IBookWork;
  chapter?: IChapter;
}) {
  const [format, setFormat] = useState('standard');

  return (
    <div className="h-full flex flex-col">
      <div className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
        <ScrollText className="size-4 text-primary" />
        剧本参数
      </div>
      <div className="flex-1 overflow-y-auto space-y-4 pr-1">
        <div className="space-y-2">
          <Label className="text-xs font-medium">源章节</Label>
          <div className="rounded-lg border border-border/60 bg-background/60 px-3 py-2 text-sm text-foreground">
            {chapter ? chapter.title : '请先在章节管理中选择章节'}
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-medium">剧本格式</Label>
          <div className="space-y-1.5">
            {[
              { value: 'standard', label: '标准剧本', desc: '场景 + 人物 + 对白 + 动作描写' },
              { value: 'screenplay', label: '影视剧本', desc: '场景标题 + 动作 + 对白 + 镜头提示' },
              { value: 'stage', label: '舞台剧', desc: '场次 + 人物 + 对白 + 舞台提示' },
              { value: 'comic', label: '漫画脚本', desc: '分镜 + 画框描述 + 对白 + 旁白' },
            ].map((item) => (
              <button
                key={item.value}
                onClick={() => setFormat(item.value)}
                className={cn(
                  'w-full px-3 py-2 rounded-lg text-left transition-colors border',
                  format === item.value
                    ? 'bg-primary/10 border-primary/30 text-foreground'
                    : 'bg-background/40 border-border/60 text-foreground hover:border-primary/40'
                )}
              >
                <div className="text-sm font-medium">{item.label}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{item.desc}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 text-xs text-muted-foreground leading-relaxed">
          <p className="text-primary font-medium mb-1">转换提示</p>
          <p>
            AI 将把章节正文转换为剧本格式，保留核心情节与人物对话。选择合适的格式风格后点击「转换剧本」。
          </p>
        </div>
      </div>
    </div>
  );
}
