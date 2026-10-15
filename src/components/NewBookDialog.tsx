import { useState, useRef, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import {
  Image as ImageIcon,
  Upload,
  Sparkles,
  History,
  Wand2,
  Loader2,
  X,
  BookType,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Image } from '@/components/ui/image';
import type { IBookWork } from '@/data/novel';
import { CATEGORY_GROUPS } from '@/data/novel';
import {
  createEmptyBook,
  createBook,
  suggestTitles,
  generateCover,
} from '@/lib/novel-generator';

interface NewBookDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (book: IBookWork) => void;
}

export default function NewBookDialog({
  open,
  onOpenChange,
  onCreated,
}: NewBookDialogProps) {
  const [book, setBook] = useState<IBookWork>(createEmptyBook());
  const [coverTab, setCoverTab] = useState<'ai' | 'upload' | 'history'>('ai');
  const [isGeneratingTitle, setIsGeneratingTitle] = useState(false);
  const [isGeneratingCover, setIsGeneratingCover] = useState(false);
  const [titleSuggestions, setTitleSuggestions] = useState<string[]>([]);
  const [titleRawText, setTitleRawText] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [genre, setGenre] = useState('玄幻');
  const [coverStyle, setCoverStyle] = useState('古风唯美');

  const reset = () => {
    setBook(createEmptyBook());
    setTitleSuggestions([]);
    setTitleRawText('');
    setCoverTab('ai');
    setGenre('玄幻');
    setCoverStyle('古风唯美');
  };

  const handleCategoryChange = (cat: 'male' | 'female') => {
    setBook((b) => ({ ...b, category: cat, genre: CATEGORY_GROUPS[cat].genres[0] }));
    setGenre(CATEGORY_GROUPS[cat].genres[0]);
  };

  const handleGenerateTitles = async () => {
    if (!book.styleDescription && !book.setting) {
      toast.info('请先填写风格描述或核心设定');
      return;
    }
    setIsGeneratingTitle(true);
    setTitleRawText('');
    setTitleSuggestions([]);
    try {
      await suggestTitles(
        `${book.category === 'male' ? '男频' : '女频'} ${genre}`,
        coverStyle,
        book.styleDescription || book.setting,
        (chunk) => {
          setTitleRawText((prev) => prev + chunk);
        }
      );
    } catch (error) {
      // toast already shown
    } finally {
      setIsGeneratingTitle(false);
    }
  };

  useEffect(() => {
    if (!titleRawText) return;
    const lines = titleRawText
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l && /^[\d一二三四五六七八九十]/.test(l));
    const cleaned = lines
      .map((l) => l.replace(/^[\d一二三四五六七八九十]+[.、)\s]+/, '').trim())
      .filter((l) => l.length > 1 && l.length < 20);
    if (cleaned.length > 0) {
      setTitleSuggestions(cleaned.slice(0, 10));
    } else {
      const fallback = titleRawText
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l.length > 1 && l.length < 20 && !/^[#*\-]/.test(l))
        .slice(0, 10);
      setTitleSuggestions(fallback);
    }
  }, [titleRawText]);

  const handlePickTitle = (t: string) => {
    setBook((b) => ({ ...b, title: t }));
  };

  const handleGenerateCover = async () => {
    if (!book.title) {
      toast.info('请先填写书名');
      return;
    }
    setIsGeneratingCover(true);
    try {
      const images = await generateCover(
        book.title,
        genre,
        coverStyle,
        book.styleDescription
      );
      if (images.length > 0) {
        setBook((b) => ({ ...b, coverImage: images[0] }));
        toast.success('封面生成成功');
      }
    } catch {
      // toast shown
    } finally {
      setIsGeneratingCover(false);
    }
  };

  const handleUploadCover = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!/^image\//.test(file.type)) {
      toast.error('请选择图片文件');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setBook((b) => ({ ...b, coverImage: reader.result as string }));
    };
    reader.readAsDataURL(file);
  };

  const handleCreate = async () => {
    if (!book.title.trim()) {
      toast.info('请填写书名');
      return;
    }
    const newBookData = {
      ...book,
      genre,
      updatedAt: Date.now(),
    };
    const created = await createBook(newBookData);
    if (created) {
      toast.success('作品创建成功');
      onCreated(created);
    } else {
      // 错误消息由 createBook 内部通过 toast 抛出，这里只兜底
    }
    reset();
  };

  const handleCancel = () => {
    onOpenChange(false);
    setTimeout(reset, 300);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto bg-gradient-to-br from-card to-background border-primary/10">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-2xl font-bold text-foreground">
              新建书籍
            </DialogTitle>
            <p className="text-sm text-muted-foreground italic">
              落笔成章，自此始之。
            </p>
          </div>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-2">
          {/* 左侧封面区 */}
          <div className="md:col-span-1">
            <div className="aspect-[3/4] rounded-xl border-2 border-dashed border-primary/25 bg-muted/30 flex flex-col items-center justify-center overflow-hidden relative group">
              {book.coverImage ? (
                <>
                  <Image
                    src={book.coverImage}
                    alt="封面预览"
                    className="w-full h-full object-cover"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="!absolute top-2 right-2 z-20 h-7 w-7 rounded-full bg-black/40 text-white hover:bg-black/60"
                    onClick={() => setBook((b) => ({ ...b, coverImage: '' }))}
                  >
                    <X className="size-3.5" />
                  </Button>
                </>
              ) : (
                <div className="text-center text-muted-foreground">
                  <ImageIcon className="size-10 mx-auto mb-2 text-primary/40" />
                  <p className="text-sm">上传封面</p>
                  <p className="text-xs mt-1 opacity-60">JPG / PNG / WebP</p>
                </div>
              )}
            </div>

            <Tabs
              value={coverTab}
              onValueChange={(v) => setCoverTab(v as any)}
              className="mt-3"
            >
              <TabsList className="w-full grid grid-cols-3 bg-muted/50">
                <TabsTrigger value="ai" className="text-xs">
                  <Sparkles className="size-3 mr-1" />
                  AI 生成
                </TabsTrigger>
                <TabsTrigger value="upload" className="text-xs">
                  <Upload className="size-3 mr-1" />
                  上传
                </TabsTrigger>
                <TabsTrigger value="history" className="text-xs">
                  <History className="size-3 mr-1" />
                  历史
                </TabsTrigger>
              </TabsList>
              <div className="mt-3">
                <TabsContent value="ai" className="space-y-3 mt-0">
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1.5 block">
                      封面风格
                    </Label>
                    <Input
                      value={coverStyle}
                      onChange={(e) => setCoverStyle(e.target.value)}
                      placeholder="古风唯美"
                      className="text-sm h-9"
                    />
                  </div>
                  <Button
                    className="w-full bg-gradient-to-r from-primary to-emerald-500 text-primary-foreground hover:from-primary/90 hover:to-emerald-500/90 shadow-sm shadow-primary/20"
                    onClick={handleGenerateCover}
                    disabled={isGeneratingCover}
                  >
                    {isGeneratingCover ? (
                      <>
                        <Loader2 className="size-4 mr-1.5 animate-spin" />
                        生成中...
                      </>
                    ) : (
                      <>
                        <Wand2 className="size-4 mr-1.5" />
                        AI 生成封面
                      </>
                    )}
                  </Button>
                  <p className="text-[11px] text-muted-foreground text-center">
                    每次生成消耗 0.50 靓文币
                  </p>
                </TabsContent>
                <TabsContent value="upload" className="mt-0">
                  <input
                    type="file"
                    accept="image/*"
                    ref={fileInputRef}
                    onChange={handleUploadCover}
                    className="hidden"
                  />
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="size-4 mr-1.5" />
                    选择图片
                  </Button>
                </TabsContent>
                <TabsContent value="history" className="mt-0">
                  <div className="text-center py-4 text-sm text-muted-foreground">
                    暂无历史封面
                  </div>
                </TabsContent>
              </div>
            </Tabs>
          </div>

          {/* 右侧信息区 */}
          <div className="md:col-span-2 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-sm text-muted-foreground mb-1.5 block">
                  书名
                </Label>
                <div className="relative">
                  <Input
                    value={book.title}
                    onChange={(e) =>
                      setBook((b) => ({ ...b, title: e.target.value }))
                    }
                    placeholder="为你的作品题名"
                    className="h-11 text-base pr-16 bg-background/60"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="!absolute right-1 top-1/2 z-10 h-8 w-8 -translate-y-1/2 text-primary hover:text-primary/80"
                    onClick={handleGenerateTitles}
                    disabled={isGeneratingTitle}
                  >
                    {isGeneratingTitle ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Wand2 className="size-4" />
                    )}
                  </Button>
                </div>
              </div>
              <div>
                <Label className="text-sm text-muted-foreground mb-1.5 block">
                  作者
                </Label>
                <Input
                  value={book.author}
                  onChange={(e) =>
                    setBook((b) => ({ ...b, author: e.target.value }))
                  }
                  placeholder="墨客"
                  className="h-11 text-base bg-background/60"
                />
              </div>
            </div>

            {/* 分类 */}
            <div>
              <Label className="text-sm text-muted-foreground mb-2 block">
                分类
              </Label>
              <div className="grid grid-cols-2 gap-3">
                {(Object.keys(CATEGORY_GROUPS) as Array<'male' | 'female'>).map(
                  (key) => {
                    const g = CATEGORY_GROUPS[key];
                    const active = book.category === key;
                    return (
                      <button
                        key={key}
                        onClick={() => handleCategoryChange(key)}
                        className={`text-left p-3 rounded-lg border transition-all ${
                          active
                            ? 'border-primary bg-primary/8 shadow-sm shadow-primary/10'
                            : 'border-border/60 bg-background/40 hover:border-primary/40'
                        }`}
                      >
                        <div
                          className={`text-sm font-semibold ${
                            active ? 'text-primary' : 'text-foreground'
                          }`}
                        >
                          {g.label}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {g.desc}
                        </div>
                      </button>
                    );
                  }
                )}
              </div>
            </div>

            {/* 题材标签 */}
            <div>
              <Label className="text-sm text-muted-foreground mb-2 block">
                题材
              </Label>
              <div className="flex flex-wrap gap-2">
                {CATEGORY_GROUPS[book.category].genres.map((g) => (
                  <button
                    key={g}
                    onClick={() => setGenre(g)}
                    className={`px-3 py-1 text-xs rounded-full border transition-all ${
                      genre === g
                        ? 'bg-primary text-primary-foreground border-primary shadow-sm shadow-primary/20'
                        : 'bg-background/50 border-border/60 text-muted-foreground hover:border-primary/40 hover:text-foreground'
                    }`}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>

            {/* 风格描述 */}
            <div>
              <Label className="text-sm text-muted-foreground mb-1.5 block">
                风格创作
              </Label>
              <Textarea
                value={book.styleDescription}
                onChange={(e) =>
                  setBook((b) => ({ ...b, styleDescription: e.target.value }))
                }
                placeholder="描述叙述风格与语言质感，如：第三人称限知，短句战斗、长句抒情，节奏紧凑……"
                rows={3}
                className="bg-background/60 resize-none"
              />
            </div>

            {/* 书名建议 */}
            {(isGeneratingTitle || titleSuggestions.length > 0) && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="border border-primary/15 rounded-lg p-3 bg-primary/5"
              >
                <div className="flex items-center gap-1.5 mb-2 text-sm font-medium text-primary">
                  <Sparkles className="size-3.5" />
                  AI 书名建议
                </div>
                {isGeneratingTitle && titleSuggestions.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    正在思考有吸引力的书名...
                  </p>
                )}
                <div className="flex flex-wrap gap-1.5">
                  {titleSuggestions.slice(0, 8).map((t, i) => (
                    <Badge
                      key={`${t}-${i}`}
                      variant="outline"
                      className="cursor-pointer hover:bg-primary/10 hover:border-primary/40 text-xs bg-background/60"
                      onClick={() => handlePickTitle(t)}
                    >
                      {t}
                    </Badge>
                  ))}
                </div>
              </motion.div>
            )}
          </div>
        </div>

        <DialogFooter className="flex-row justify-end gap-2 sm:justify-end">
          <Button variant="outline" onClick={handleCancel}>
            取消
          </Button>
          <Button
            className="bg-gradient-to-r from-primary to-emerald-500 text-primary-foreground hover:from-primary/90 hover:to-emerald-500/90 shadow-md shadow-primary/20"
            onClick={handleCreate}
          >
            创建
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
