import { useState, useRef, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  PenTool,
  Sparkles,
  Copy,
  Save,
  RefreshCw,
  Plus,
  X,
  Users,
  BookOpen,
  Loader2,
  Wand2,
  FileText,
  Hash,
  BookMarked,
  Edit3,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  GENRE_OPTIONS,
  TYPE_OPTIONS,
  STYLE_OPTIONS,
  PERSPECTIVE_OPTIONS,
  WORD_COUNT_OPTIONS,
  type ICharacter,
  type ICreationParams,
  type NovelType,
  type NarrativePerspective,
  type IBookWork,
} from '@/data/novel';
import {
  generateNovel,
  continueNovel,
  humanizeText,
  getBook,
  saveBook as saveBookToLibrary,
  createEmptyChapter,
} from '@/lib/novel-generator';
import { scopedStorage, logger } from '@lark-apaas/client-toolkit-lite';

const STORAGE_KEY_DRAFT = 'liangwen_draft_params';
const STORAGE_KEY_WORK = 'liangwen_current_work';

function createDefaultCharacters(): ICharacter[] {
  return [
    { id: '1', name: '林渊', identity: '没落世家子弟', personality: '坚韧隐忍、心思缜密' },
  ];
}

function createDefaultParams(genre = ''): ICreationParams {
  return {
    genre: genre || '玄幻',
    novelType: 'short',
    setting:
      '一个灵气复苏的玄幻世界，宗门林立，强者为尊。主角出身小城的没落家族，凭借一柄残剑踏上修仙之路，在阴谋与机遇中一步步走向巅峰。',
    characters: createDefaultCharacters(),
    writingStyle: '华丽唯美',
    narrativePerspective: 'third',
    extraRequirements: '',
    chapter: '',
    chapterSummary: '',
    wordCount: '1000字左右',
  };
}

export default function WritePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const bookId = searchParams.get('book');
  const initialGenre = searchParams.get('genre') || '';

  const [book, setBook] = useState<IBookWork | null>(null);
  const [bookLoading, setBookLoading] = useState(!!bookId);

  // 异步加载书籍数据
  useEffect(() => {
    let mounted = true;
    if (!bookId) {
      setBook(null);
      setBookLoading(false);
      return;
    }
    (async () => {
      const b = await getBook(bookId);
      if (!mounted) return;
      setBook(b || null);
      setBookLoading(false);
    })();
    return () => { mounted = false; };
  }, [bookId]);

  const [params, setParams] = useState<ICreationParams>(() => createDefaultParams(initialGenre));

  // 书籍加载后同步参数
  useEffect(() => {
    if (!book) return;
    setParams({
      genre: book.genre,
      novelType: 'short',
      setting: book.styleDescription,
      characters: book.characters.length > 0 ? book.characters : createDefaultCharacters(),
      writingStyle: book.writingStyle,
      narrativePerspective: book.narrativePerspective,
      extraRequirements: '',
      chapter: '',
      chapterSummary: '',
      wordCount: '3000字左右',
    });
    if (book.chapters.length > 0) {
      const latest = book.chapters[book.chapters.length - 1];
      setContent(latest.content || '');
    }
  }, [book]);

  const [content, setContent] = useState<string>(() => {
    try {
      const saved = scopedStorage.getItem(STORAGE_KEY_WORK);
      if (saved) {
        const work = JSON.parse(saved);
        return work.content || '';
      }
    } catch {
      /* ignore */
    }
    return '';
  });

  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editTitle, setEditTitle] = useState('');

  const [isGenerating, setIsGenerating] = useState(false);
  const [isContinuing, setIsContinuing] = useState(false);
  const [isHumanizing, setIsHumanizing] = useState(false);
  const [continueDirection, setContinueDirection] = useState('');
  const [showContinueInput, setShowContinueInput] = useState(false);
  const resultRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      scopedStorage.setItem(STORAGE_KEY_DRAFT, JSON.stringify(params));
    } catch {
      /* ignore */
    }
  }, [params]);

  useEffect(() => {
    if (content) {
      try {
        const work = {
          id: Date.now().toString(),
          title: params.setting?.slice(0, 20) || '未命名作品',
          params,
          content,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        scopedStorage.setItem(STORAGE_KEY_WORK, JSON.stringify(work));
      } catch {
        /* ignore */
      }
    }
  }, [content, params]);

  // 自动保存到作品（如果有 bookId）
  const autoSaveToBook = useCallback(
    (newContent: string, newParams: ICreationParams) => {
      if (!book || !bookId) return;
      const updated: IBookWork = {
        ...book,
        genre: newParams.genre,
        writingStyle: newParams.writingStyle,
        narrativePerspective: newParams.narrativePerspective,
        styleDescription: newParams.setting,
        characters: newParams.characters.filter((c) => c.name.trim()),
        updatedAt: Date.now(),
      };
      // 更新最新章节或新建章节
      if (updated.chapters.length === 0) {
        const ch = createEmptyChapter(newParams.chapter || '第一章');
        ch.content = newContent;
        ch.wordCount = newContent.length;
        ch.summary = newParams.chapterSummary || '';
        updated.chapters = [ch];
      } else {
        const lastIdx = updated.chapters.length - 1;
        updated.chapters[lastIdx] = {
          ...updated.chapters[lastIdx],
          content: newContent,
          wordCount: newContent.length,
          title: newParams.chapter || updated.chapters[lastIdx].title,
          summary: newParams.chapterSummary || updated.chapters[lastIdx].summary,
          updatedAt: Date.now(),
          status: newContent.length > 0 ? 'completed' : 'draft',
        };
      }
      updated.chapterCount = updated.chapters.length;
      updated.wordCount = updated.chapters.reduce((s, c) => s + c.wordCount, 0);
      saveBookToLibrary(updated); // fire-and-forget
      setBook(updated);
    },
    [book, bookId]
  );

  useEffect(() => {
    // 生成/续写/优化完成后保存到作品
    if (!isGenerating && !isContinuing && !isHumanizing && content && bookId) {
      autoSaveToBook(content, params);
    }
  }, [isGenerating, isContinuing, isHumanizing, content, params, bookId, autoSaveToBook]);

  const updateParam = <K extends keyof ICreationParams>(
    key: K,
    value: ICreationParams[K]
  ) => {
    setParams((prev) => ({ ...prev, [key]: value }));
  };

  const addCharacter = () => {
    const newChar: ICharacter = {
      id: Date.now().toString(),
      name: '',
      identity: '',
      personality: '',
    };
    updateParam('characters', [...params.characters, newChar]);
  };

  const removeCharacter = (id: string) => {
    if (params.characters.length <= 1) return;
    updateParam(
      'characters',
      params.characters.filter((c) => c.id !== id)
    );
  };

  const updateCharacter = (id: string, field: keyof ICharacter, value: string) => {
    updateParam(
      'characters',
      params.characters.map((c) => (c.id === id ? { ...c, [field]: value } : c))
    );
  };

  const buildCharacterString = (): string => {
    return params.characters
      .filter((c) => c.name.trim())
      .map(
        (c) =>
          `${c.name}${c.identity ? `（${c.identity}）` : ''}${c.personality ? `：性格${c.personality}` : ''}${c.description ? `。${c.description}` : ''}`
      )
      .join('\n');
  };

  const validateParams = (): boolean => {
    if (!params.genre.trim()) {
      toast.warning('请选择小说题材');
      return false;
    }
    if (!params.setting.trim()) {
      toast.warning('请填写世界观设定');
      return false;
    }
    const hasValidChar = params.characters.some((c) => c.name.trim());
    if (!hasValidChar) {
      toast.warning('请至少填写一个主要人物');
      return false;
    }
    return true;
  };

  const buildAdditionalReqs = (): string => {
    const parts: string[] = [];
    if (params.chapter) parts.push(`章节标题：${params.chapter}`);
    if (params.chapterSummary) parts.push(`章节梗概：${params.chapterSummary}`);
    if (params.wordCount) parts.push(`目标字数：${params.wordCount}`);
    if (params.extraRequirements) parts.push(params.extraRequirements);
    return parts.join('\n');
  };

  const handleGenerate = async () => {
    if (!validateParams()) return;
    setIsGenerating(true);
    setContent('');

    try {
      await generateNovel(
        {
          genre: params.genre,
          novel_type:
            TYPE_OPTIONS.find((t) => t.value === params.novelType)?.label ||
            params.novelType,
          setting: params.setting || '一部小说的故事背景',
          characters: buildCharacterString() || '主角待设定',
          style: params.writingStyle,
          perspective:
            PERSPECTIVE_OPTIONS.find((p) => p.value === params.narrativePerspective)
              ?.label || '第三人称',
          target_word_count: params.wordCount?.replace(/[^0-9]/g, '') || '1000',
          additional_requirements: buildAdditionalReqs() || '请创作一篇完整的短篇小说。',
        },
        (piece) => {
          setContent((prev) => prev + piece);
        }
      );
      toast.success('短篇生成完成');
    } catch (error) {
      logger.error('[WritePage] generate failed:', String(error));
      toast.error('生成失败，请稍后重试');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleContinue = async () => {
    if (!content.trim()) {
      toast.warning('请先生成一些内容再续写');
      return;
    }
    setIsContinuing(true);
    setShowContinueInput(false);

    try {
      await continueNovel(
        content,
        continueDirection,
        {
          genre: params.genre,
          novel_type: TYPE_OPTIONS.find((t) => t.value === params.novelType)?.label || params.novelType,
          setting: params.setting,
          characters: buildCharacterString() || '主角待设定',
          style: params.writingStyle,
        },
        (piece) => {
          setContent((prev) => prev + piece);
        }
      );
      toast.success('续写完成');
      setContinueDirection('');
    } catch {
      // error handled in generator
    } finally {
      setIsContinuing(false);
    }
  };

  const handleHumanize = async () => {
    if (!content.trim()) {
      toast.warning('请先生成一些内容再优化');
      return;
    }
    setIsHumanizing(true);
    const originalText = content;
    setContent('');

    try {
      await humanizeText(
        originalText,
        undefined,
        (piece) => {
          setContent((prev) => prev + piece);
        }
      );
      toast.success('去 AI 味优化完成');
    } catch {
      setContent(originalText);
    } finally {
      setIsHumanizing(false);
    }
  };

  const handleCopy = async () => {
    if (!content) return;
    try {
      await navigator.clipboard.writeText(content);
      toast.success('已复制到剪贴板');
    } catch {
      toast.error('复制失败，请手动选择复制');
    }
  };

  const handleSave = () => {
    if (!content) return;
    if (bookId && book) {
      autoSaveToBook(content, params);
      toast.success('已保存到藏书阁');
      return;
    }
    const work = {
      id: Date.now().toString(),
      title: params.setting?.slice(0, 20) || '未命名作品',
      params,
      content,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    try {
      const historyKey = 'liangwen_history';
      const existing = scopedStorage.getItem(historyKey);
      const history = existing ? JSON.parse(existing) : [];
      history.unshift(work);
      scopedStorage.setItem(historyKey, JSON.stringify(history.slice(0, 20)));
      toast.success('已保存到创作历史');
    } catch {
      toast.error('保存失败');
    }
  };

  const handleRenameBook = () => {
    if (!book || !editTitle.trim()) return;
    const updated = { ...book, title: editTitle.trim() };
    saveBookToLibrary(updated);
    setBook(updated);
    setIsEditingTitle(false);
  };

  const wordCount = content.length;

  const handleRegenerate = () => {
    if (isGenerating || isContinuing || isHumanizing) return;
    handleGenerate();
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-br from-background via-primary/5 to-background">
      <div className="max-w-[1600px] mx-auto px-4 md:px-6 py-6">
        <div className="flex items-center justify-between mb-6">
          <div className="min-w-0">
            {book ? (
              <div className="flex items-center gap-2">
                {isEditingTitle ? (
                  <div className="flex items-center gap-2">
                    <Input
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="h-8 text-xl font-bold w-64 bg-background/60"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleRenameBook();
                      }}
                    />
                    <Button size="sm" variant="ghost" onClick={handleRenameBook}>
                      确定
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setIsEditingTitle(false)}
                    >
                      取消
                    </Button>
                  </div>
                ) : (
                  <h1 className="text-2xl font-bold text-foreground flex items-center gap-2 truncate">
                    <FileText className="size-6 text-primary shrink-0" />
                    <span className="truncate max-w-[400px]">{book.title || '未命名作品'}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-6 text-muted-foreground hover:text-primary shrink-0"
                      onClick={() => {
                        setEditTitle(book.title || '');
                        setIsEditingTitle(true);
                      }}
                    >
                      <Edit3 className="size-4" />
                    </Button>
                  </h1>
                )}
              </div>
            ) : (
              <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                <PenTool className="size-6 text-primary" />
                短篇创作工作台
              </h1>
            )}
            <p className="text-sm text-muted-foreground mt-1">
              {book
                ? `${book.chapterCount} 章 · ${book.wordCount} 字 · 最后更新于刚刚`
                : '短篇精炼，AI 快速为你成文'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {book && (
              <Badge
                variant="outline"
                className="border-primary/30 text-primary bg-primary/5 hidden md:inline-flex"
              >
                <Sparkles className="size-3 mr-1" />
                {book.genre} · {book.category === 'male' ? '男频' : '女频'}
              </Badge>
            )}
            <Button
              variant="outline"
              size="sm"
              className="border-primary/30 text-primary hover:bg-primary/10"
              onClick={() => navigate('/library')}
            >
              <BookMarked className="size-4 mr-1.5" />
              藏书阁
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[400px_1fr] gap-6">
          {/* 左侧：参数配置 */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="space-y-4"
          >
            <Card className="border-primary/15">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Wand2 className="size-5 text-primary" />
                  创作参数
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                {/* 题材 */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    小说题材
                  </label>
                  <Select
                    value={params.genre}
                    onValueChange={(v) => updateParam('genre', v)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="选择题材" />
                    </SelectTrigger>
                    <SelectContent>
                      {GENRE_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* 类型 */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    小说类型
                  </label>
                  <Select
                    value={params.novelType}
                    onValueChange={(v) => updateParam('novelType', v as NovelType)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="选择类型" />
                    </SelectTrigger>
                    <SelectContent>
                      {TYPE_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* 目标字数 */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    目标字数
                  </label>
                  <Select
                    value={params.wordCount || ''}
                    onValueChange={(v) => updateParam('wordCount', v)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="选择字数" />
                    </SelectTrigger>
                    <SelectContent>
                      {WORD_COUNT_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* 风格 */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    文笔风格
                  </label>
                  <Select
                    value={params.writingStyle}
                    onValueChange={(v) => updateParam('writingStyle', v)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="选择风格" />
                    </SelectTrigger>
                    <SelectContent>
                      {STYLE_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* 视角 */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    叙事视角
                  </label>
                  <Select
                    value={params.narrativePerspective}
                    onValueChange={(v) =>
                      updateParam('narrativePerspective', v as NarrativePerspective)
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="选择视角" />
                    </SelectTrigger>
                    <SelectContent>
                      {PERSPECTIVE_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Separator />

                {/* 世界观设定 */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground flex items-center gap-1.5">
                    <BookOpen className="size-4 text-primary" />
                    世界观设定
                  </label>
                  <Textarea
                    value={params.setting}
                    onChange={(e) => updateParam('setting', e.target.value)}
                    placeholder="描述故事的世界观背景，例如：修仙世界，灵气复苏，宗门林立……"
                    className="min-h-[90px] resize-none"
                  />
                </div>

                {/* 人物设定 */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-foreground flex items-center gap-1.5">
                      <Users className="size-4 text-primary" />
                      主要人物
                    </label>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs text-primary hover:text-primary hover:bg-primary/10"
                      onClick={addCharacter}
                    >
                      <Plus className="size-3.5 mr-1" />
                      添加人物
                    </Button>
                  </div>

                  <Accordion type="multiple" className="space-y-2">
                    {params.characters.map((char, idx) => (
                      <AccordionItem
                        key={char.id}
                        value={`char-${char.id}`}
                        className="border border-border/60 rounded-lg px-3 data-[state=open]:border-primary/20"
                      >
                        <div className="flex items-center justify-between">
                          <AccordionTrigger className="py-2 hover:no-underline">
                            <span className="text-sm font-medium text-foreground">
                              {char.name || `人物 ${idx + 1}`}
                            </span>
                          </AccordionTrigger>
                          {params.characters.length > 1 && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-6 hover:text-destructive"
                              onClick={(e) => {
                                e.stopPropagation();
                                removeCharacter(char.id);
                              }}
                            >
                              <X className="size-3.5" />
                            </Button>
                          )}
                        </div>
                        <AccordionContent className="space-y-3 pb-3">
                          <div>
                            <label className="text-xs text-muted-foreground">姓名</label>
                            <Input
                              value={char.name}
                              onChange={(e) => updateCharacter(char.id, 'name', e.target.value)}
                              placeholder="人物姓名"
                              className="mt-1 h-9"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-muted-foreground">身份</label>
                            <Input
                              value={char.identity || ''}
                              onChange={(e) => updateCharacter(char.id, 'identity', e.target.value)}
                              placeholder="如：剑修、皇子、总裁……"
                              className="mt-1 h-9"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-muted-foreground">性格</label>
                            <Input
                              value={char.personality || ''}
                              onChange={(e) => updateCharacter(char.id, 'personality', e.target.value)}
                              placeholder="如：冷酷隐忍、乐观开朗……"
                              className="mt-1 h-9"
                            />
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </div>

                <Separator />

                {/* 补充要求 */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    补充要求（可选）
                  </label>
                  <Textarea
                    value={params.extraRequirements || ''}
                    onChange={(e) => updateParam('extraRequirements', e.target.value)}
                    placeholder="其他创作要求，如：开篇要有悬念、加入特定情节……"
                    className="min-h-[70px] resize-none"
                  />
                </div>

                {/* 生成按钮 */}
                <Button
                  className="w-full h-11 bg-gradient-to-r from-primary to-emerald-500 text-primary-foreground hover:from-primary/90 hover:to-emerald-500/90 shadow-md shadow-primary/20 font-semibold"
                  onClick={handleGenerate}
                  disabled={isGenerating || isContinuing || isHumanizing}
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="size-4 mr-2 animate-spin" />
                      AI 创作中...
                    </>
                  ) : (
                    <>
                      <Sparkles className="size-4 mr-2" />
                      {content ? '重新生成' : '开始创作'}
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </motion.div>

          {/* 右侧：结果展示 */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="min-h-[600px]"
          >
            <Card className="h-full border-primary/15 flex flex-col">
              <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="size-5 text-primary" />
                  小说正文
                  {(isGenerating || isContinuing || isHumanizing) && (
                    <Badge variant="outline" className="ml-2 text-xs border-primary/30 text-primary">
                      <Loader2 className="size-3 mr-1 animate-spin" />
                      {isHumanizing ? '优化中' : '生成中'}
                    </Badge>
                  )}
                </CardTitle>
                {content && (
                  <div className="flex items-center gap-1 flex-wrap justify-end">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 text-muted-foreground hover:text-foreground"
                      onClick={handleCopy}
                    >
                      <Copy className="size-4 mr-1" />
                      复制
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 text-muted-foreground hover:text-foreground"
                      onClick={handleSave}
                    >
                      <Save className="size-4 mr-1" />
                      保存
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 text-muted-foreground hover:text-foreground"
                      onClick={handleRegenerate}
                      disabled={isGenerating || isContinuing || isHumanizing}
                    >
                      <RefreshCw className="size-4 mr-1" />
                      重写
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 text-primary hover:bg-primary/10"
                      onClick={handleHumanize}
                      disabled={isGenerating || isContinuing || isHumanizing}
                    >
                      <Sparkles className="size-4 mr-1" />
                      去 AI 味
                    </Button>
                  </div>
                )}
              </CardHeader>
              <CardContent className="flex-1 p-0 flex flex-col">
                <div
                  ref={resultRef}
                  className="flex-1 overflow-y-auto p-6 md:p-8 bg-gradient-to-b from-card/30 to-background/20"
                >
                  <AnimatePresence mode="wait">
                    {!content && !isGenerating && !isHumanizing ? (
                      <motion.div
                        key="empty"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="h-full flex flex-col items-center justify-center text-center py-16"
                      >
                        <div className="relative mb-6">
                          <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full scale-150" />
                          <div className="relative size-24 md:size-28 flex items-center justify-center">
                            <FileText className="size-16 text-primary/60" />
                          </div>
                        </div>
                        <h3 className="text-xl font-semibold text-foreground mb-2">
                          开启你的创作之旅
                        </h3>
                        <p className="text-muted-foreground max-w-sm text-sm leading-relaxed mb-6">
                          在左侧填写小说题材、设定与人物，点击「开始创作」，
                          AI 将为你实时生成精彩小说内容。
                        </p>
                        <div className="flex flex-wrap justify-center gap-2">
                          {['玄幻奇幻', '仙侠修真', '都市言情', '悬疑推理'].map((g) => (
                            <Badge
                              key={g}
                              variant="outline"
                              className="cursor-pointer hover:bg-primary/10 hover:text-primary border-primary/20"
                              onClick={() => updateParam('genre', g)}
                            >
                              {g}
                            </Badge>
                          ))}
                        </div>
                      </motion.div>
                    ) : (
                      <motion.article
                        key="content"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.4 }}
                        className="prose prose-sm max-w-none prose-p:leading-relaxed prose-p:text-foreground/90 prose-p:my-4 prose-headings:text-foreground dark:prose-invert"
                      >
                        {content.split('\n').map((paragraph, i) =>
                          paragraph.trim() ? (
                            <p key={i}>{paragraph}</p>
                          ) : (
                            <br key={i} />
                          )
                        )}
                        {(isGenerating || isContinuing || isHumanizing) && (
                          <span className="inline-block w-2 h-5 bg-primary/60 ml-1 animate-pulse align-middle" />
                        )}
                      </motion.article>
                    )}
                  </AnimatePresence>
                </div>

                {/* 底部续写区 */}
                {content && !isGenerating && !isHumanizing && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="border-t border-border/60 p-4 bg-card/30"
                  >
                    {showContinueInput ? (
                      <div className="space-y-3">
                        <Textarea
                          value={continueDirection}
                          onChange={(e) => setContinueDirection(e.target.value)}
                          placeholder="输入续写方向（可选），例如：主角遭遇强敌、揭开某个秘密……"
                          className="min-h-[60px] resize-none"
                        />
                        <div className="flex gap-2 justify-end">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowContinueInput(false)}
                          >
                            取消
                          </Button>
                          <Button
                            size="sm"
                             className="bg-gradient-to-r from-primary to-emerald-500 text-primary-foreground"
                            onClick={handleContinue}
                            disabled={isContinuing}
                          >
                            {isContinuing ? (
                              <>
                                <Loader2 className="size-3.5 mr-1.5 animate-spin" />
                                续写中...
                              </>
                            ) : (
                              <>
                                <Sparkles className="size-3.5 mr-1.5" />
                                继续续写
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">
                          想继续往下写？
                        </span>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-primary/30 text-primary hover:bg-primary/10"
                          onClick={() => setShowContinueInput(true)}
                        >
                          <RefreshCw className="size-3.5 mr-1.5" />
                          继续续写
                        </Button>
                      </div>
                    )}
                  </motion.div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
