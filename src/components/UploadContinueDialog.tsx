import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Upload,
  FileText,
  Sparkles,
  Check,
  BookOpen,
  X,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { IBookWork } from '@/data/novel.ts';
import {
  parseUploadedContent,
  createEmptyChapter,
  createBook,
  setCurrentBookId,
} from '@/lib/novel-generator.ts';

interface UploadContinueDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (book: IBookWork) => void;
}

type UploadStep = 'input' | 'analyzing' | 'result';

export default function UploadContinueDialog({
  open,
  onOpenChange,
  onCreated,
}: UploadContinueDialogProps) {
  const navigate = useNavigate();
  const [step, setStep] = useState<UploadStep>('input');
  const [pasteText, setPasteText] = useState('');
  const [fileName, setFileName] = useState('');
  const [analysisText, setAnalysisText] = useState('');
  const [category, setCategory] = useState<'male' | 'female'>('male');
  const [genre, setGenre] = useState('');
  const [bookTitle, setBookTitle] = useState('');
  const [chapters, setChapters] = useState<Array<{ title: string; content: string; summary?: string }>>([]);
  const [styleAnalysis, setStyleAnalysis] = useState('');
  const [synopsis, setSynopsis] = useState('');
  const [continueSuggestions, setContinueSuggestions] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('文件大小不能超过 5MB');
      return;
    }

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = (ev.target?.result as string) || '';
      setPasteText(text);
    };

    if (file.name.endsWith('.txt') || file.name.endsWith('.md')) {
      reader.readAsText(file);
    } else if (file.name.endsWith('.docx')) {
      toast.info('DOCX 文件解析需后端支持，当前版本请先粘贴文本内容');
      setFileName('');
    } else {
      reader.readAsText(file);
    }
  };

  const handleAnalyze = async () => {
    if (!pasteText.trim()) {
      toast.warning('请先粘贴文本或上传文件');
      return;
    }
    if (pasteText.trim().length < 200) {
      toast.warning('内容过少，至少需要 200 字才能进行分析');
      return;
    }

    setStep('analyzing');
    setAnalysisText('');
    try {
      const result = await parseUploadedContent(pasteText, (piece) => {
        setAnalysisText((prev) => prev + piece);
      });

      setBookTitle(result.title);
      setGenre(result.genre);
      setChapters(result.chapters);
      setStyleAnalysis(result.styleAnalysis);
      setSynopsis(result.synopsis);
      setContinueSuggestions(result.continueSuggestions);
      setStep('result');
      toast.success('内容解析完成');
    } catch {
      setStep('input');
    }
  };

  const handleCreateBook = async () => {
    if (!bookTitle.trim()) {
      toast.warning('请输入书名');
      return;
    }

    const now = Date.now();
    const bookId = `upload_${now}`;

    // 创建章节
    const newChapters = chapters.map((ch, idx) => ({
      ...createEmptyChapter(ch.title || `第${idx + 1}章`),
      id: `ch_${now}_${idx}`,
      content: ch.content || '',
      summary: ch.summary || '',
      wordCount: (ch.content || '').length,
      status: 'completed' as const,
      createdAt: now,
      updatedAt: now,
    }));

    const newBook: IBookWork = {
      id: bookId,
      title: bookTitle,
      author: '墨客',
      genre: genre || '都市',
      category,
      coverImage: '',
      styleDescription: styleAnalysis,
      setting: '',
      characters: [],
      writingStyle: '朴实自然',
      narrativePerspective: 'third',
      styleGuide: styleAnalysis,
      synopsis,
      titleCandidates: [],
      blurb: '',
      outline: '',
      characterProfiles: [],
      volumes: [],
      chapters: newChapters,
      wordCount: newChapters.reduce((s, c) => s + c.wordCount, 0),
      chapterCount: newChapters.length,
      createdAt: now,
      updatedAt: now,
      status: 'active',
    };

    const created = await createBook(newBook);
    if (created) {
      setCurrentBookId(bookId);
      toast.success(`已创建《${bookTitle}》，共 ${newChapters.length} 章`);
      onOpenChange(false);
      onCreated?.(created);
      navigate(`/workbench/${bookId}`);
    }
  };

  const handleClose = () => {
    if (step === 'analyzing') return;
    onOpenChange(false);
    // 重置
    setTimeout(() => {
      setStep('input');
      setPasteText('');
      setFileName('');
      setAnalysisText('');
      setChapters([]);
      setBookTitle('');
      setGenre('');
      setStyleAnalysis('');
      setSynopsis('');
      setContinueSuggestions('');
    }, 200);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="size-5 text-primary" />
            上传续写
          </DialogTitle>
          <DialogDescription>
            上传或粘贴已有小说内容，AI 将自动分析章节结构、文风与人物设定，创建可续写的作品
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto -mx-6 px-6">
          {step === 'input' && (
            <div className="space-y-4">
              <Tabs defaultValue="paste" className="w-full">
                <TabsList className="w-full grid grid-cols-2">
                  <TabsTrigger value="paste" className="gap-2">
                    <FileText className="size-4" />
                    粘贴文本
                  </TabsTrigger>
                  <TabsTrigger value="upload" className="gap-2">
                    <Upload className="size-4" />
                    上传文件
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="paste" className="space-y-3">
                  <Textarea
                    value={pasteText}
                    onChange={(e) => setPasteText(e.target.value)}
                    placeholder="请粘贴已有小说内容（建议 200 字以上，AI 将自动分析章节结构与文风）..."
                    className="min-h-[320px] resize-none font-mono text-sm"
                  />
                  <p className="text-xs text-muted-foreground">
                    当前 {pasteText.length} 字，建议至少 200 字以获得更准确的分析结果
                  </p>
                </TabsContent>

                <TabsContent value="upload" className="space-y-3">
                  <div
                    className="border-2 border-dashed border-border/70 rounded-xl p-8 text-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="size-10 text-muted-foreground mx-auto mb-3" />
                    <p className="text-sm text-foreground font-medium mb-1">
                      点击选择文件
                    </p>
                    <p className="text-xs text-muted-foreground">
                      支持 .txt / .md / .docx 格式，最大 5MB
                    </p>
                    {fileName && (
                      <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs">
                        <Check className="size-3.5" />
                        {fileName}
                      </div>
                    )}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".txt,.md,.docx"
                      className="hidden"
                      onChange={handleFileChange}
                    />
                  </div>
                  {pasteText && (
                    <div className="text-xs text-muted-foreground flex items-center gap-2">
                      <Check className="size-3.5 text-success" />
                      已读取 {pasteText.length} 字内容
                    </div>
                  )}
                </TabsContent>
              </Tabs>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-xs">分类</Label>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant={category === 'male' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setCategory('male')}
                      className="flex-1"
                    >
                      男频
                    </Button>
                    <Button
                      type="button"
                      variant={category === 'female' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setCategory('female')}
                      className="flex-1"
                    >
                      女频
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">题材（可选）</Label>
                  <Input
                    value={genre}
                    onChange={(e) => setGenre(e.target.value)}
                    placeholder="如：玄幻、都市、仙侠..."
                    className="h-9"
                  />
                </div>
              </div>
            </div>
          )}

          {step === 'analyzing' && (
            <div className="py-8 space-y-4">
              <div className="flex flex-col items-center text-center">
                <div className="relative mb-4">
                  <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full scale-150" />
                  <Sparkles className="relative size-10 text-primary animate-spin" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-1">
                  正在分析小说内容
                </h3>
                <p className="text-sm text-muted-foreground max-w-md">
                  AI 正在识别章节结构、分析文风、梳理人物关系与故事情节...
                </p>
              </div>
              <Card className="border-border/60 bg-background/50">
                <CardContent className="p-4 max-h-[300px] overflow-y-auto text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed">
                  {analysisText || '正在开始分析...'}
                </CardContent>
              </Card>
            </div>
          )}

          {step === 'result' && (
            <div className="space-y-4">
              {/* 基本信息 */}
              <Card className="border-primary/20 bg-primary/5">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <BookOpen className="size-5 text-primary shrink-0" />
                      <Input
                        value={bookTitle}
                        onChange={(e) => setBookTitle(e.target.value)}
                        className="font-semibold text-foreground h-9 bg-background/80"
                      />
                    </div>
                    <Badge className="shrink-0">
                      {category === 'male' ? '男频' : '女频'} · {genre || '未分类'}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">识别章节：</span>
                      <span className="font-semibold text-foreground">{chapters.length} 章</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">总字数：</span>
                      <span className="font-semibold text-foreground">
                        {chapters.reduce((s, c) => s + (c.content?.length || 0), 0).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 文风分析 */}
              {styleAnalysis && (
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Sparkles className="size-4 text-primary" />
                    文风分析
                  </h4>
                  <p className="text-sm text-muted-foreground leading-relaxed bg-card/60 border border-border/60 rounded-lg p-3">
                    {styleAnalysis}
                  </p>
                </div>
              )}

              {/* 续写建议 */}
              {continueSuggestions && (
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Sparkles className="size-4 text-primary" />
                    续写建议
                  </h4>
                  <p className="text-sm text-muted-foreground leading-relaxed bg-card/60 border border-border/60 rounded-lg p-3 whitespace-pre-wrap">
                    {continueSuggestions}
                  </p>
                </div>
              )}

              {/* 章节列表 */}
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <FileText className="size-4 text-primary" />
                  识别章节（{chapters.length}章）
                </h4>
                <div className="max-h-[200px] overflow-y-auto border border-border/60 rounded-lg divide-y divide-border/50">
                  {chapters.slice(0, 10).map((ch, idx) => (
                    <div key={idx} className="px-3 py-2 text-sm">
                      <div className="font-medium text-foreground">
                        {ch.title || `第${idx + 1}章`}
                      </div>
                      {ch.summary && (
                        <div className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                          {ch.summary}
                        </div>
                      )}
                    </div>
                  ))}
                  {chapters.length > 10 && (
                    <div className="px-3 py-2 text-xs text-muted-foreground text-center">
                      ... 还有 {chapters.length - 10} 章
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="pt-4 border-t border-border/60 mt-4">
          {step === 'input' && (
            <>
              <Button variant="ghost" onClick={() => onOpenChange(false)}>
                取消
              </Button>
              <Button
                onClick={handleAnalyze}
                disabled={!pasteText.trim() || pasteText.length < 200}
                className="bg-gradient-to-r from-primary to-emerald-500 text-primary-foreground hover:from-primary/90 hover:to-emerald-500/90"
              >
                <Sparkles className="size-4 mr-1.5" />
                AI 分析内容
              </Button>
            </>
          )}
          {step === 'analyzing' && (
            <Button disabled>
              <Loader2 className="size-4 mr-2 animate-spin" />
              分析中...
            </Button>
          )}
          {step === 'result' && (
            <>
              <Button variant="ghost" onClick={() => setStep('input')}>
                重新上传
              </Button>
              <Button
                onClick={handleCreateBook}
                className="bg-gradient-to-r from-primary to-emerald-500 text-primary-foreground hover:from-primary/90 hover:to-emerald-500/90"
              >
                <Check className="size-4 mr-1.5" />
                创建作品并进入续写
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
