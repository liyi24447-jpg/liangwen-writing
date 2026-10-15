import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  BookOpen,
  Upload,
  FileText,
  X,
  Download,
  Import,
  Lightbulb,
  Sparkles,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { toast } from 'sonner';
import type { IBookWork } from '@/data/novel';
import { generateSynopsis } from '@/lib/novel-generator';
import { saveBookOptimistic } from '@/lib/save-helper';

interface SynopsisStageProps {
  book: IBookWork;
  onBookUpdate: (book: IBookWork) => void;
}

interface UploadedFile {
  name: string;
  content: string;
  size: number;
}

export default function SynopsisStage({ book, onBookUpdate }: SynopsisStageProps) {
  const [creativeIdeas, setCreativeIdeas] = useState('');
  const [existingSynopsis, setExistingSynopsis] = useState(book.synopsis || '');
  const [isImportMode, setIsImportMode] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [displayContent, setDisplayContent] = useState(book.synopsis || '');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const categoryLabel = book.category === 'male' ? '男频' : '女频';

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (uploadedFiles.length + files.length > 5) {
      toast.warning('最多上传 5 个文件');
      return;
    }
    files.forEach((file) => {
      if (file.size > 10 * 1024 * 1024) {
        toast.warning(`${file.name} 超过 10MB`);
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        const content = reader.result as string;
        setUploadedFiles((prev) => [
          ...prev,
          { name: file.name, content, size: file.size },
        ]);
      };
      reader.readAsText(file);
    });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeFile = (index: number) => {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleGenerate = async () => {
    if (!book.styleGuide?.trim() && !book.styleDescription?.trim()) {
      toast.warning('请先完成创作风格设置，再生成故事梗概');
      return;
    }
    setIsGenerating(true);
    setDisplayContent('');
    try {
      const refDocs = uploadedFiles.map((f) => `=== ${f.name} ===\n${f.content}`).join('\n\n');
      const full = await generateSynopsis(
        {
          genre: book.genre,
          title: book.title,
          author: book.author,
          category: categoryLabel,
          creativeIdeas,
          referenceDocs: refDocs,
          existingSynopsis: isImportMode ? existingSynopsis : '',
          styleGuide: book.styleGuide || book.styleDescription || '',
        },
        (piece) => {
          setDisplayContent((prev) => prev + piece);
        }
      );
      const updated = { ...book, synopsis: full };
      const saved = await saveBookOptimistic(updated, onBookUpdate, { silent: true });
      if (saved) {
        toast.success('故事梗概生成完成，已自动保存');
      } else {
        toast.warning('梗概已生成，但保存失败，请手动刷新确认');
      }
    } catch {
      // error handled
    } finally {
      setIsGenerating(false);
    }
  };

  const handleExport = () => {
    if (!existingSynopsis && !displayContent) return;
    const content = displayContent || existingSynopsis;
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${book.title || '故事梗概'}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('已导出');
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
              <BookOpen className="size-5 text-primary" />
              故事梗概
            </CardTitle>
            <p className="text-xs text-muted-foreground leading-relaxed mt-1">
              结合创意补充与参考文档，生成完整的故事梗概。也支持导入已有梗概进行润色优化。
            </p>
          </CardHeader>
          <CardContent className="p-6 space-y-5">
            {/* 基本信息 */}
            <div className="space-y-3">
              <div className="text-sm font-medium text-foreground">基本信息</div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground w-14 shrink-0">书名</span>
                  <span className="font-medium text-foreground truncate">
                    {book.title || '未命名'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground w-14 shrink-0">笔名</span>
                  <span className="font-medium text-foreground">{book.author}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground w-14 shrink-0">分类</span>
                  <Badge variant="outline" className="border-primary/30 text-primary">
                    {categoryLabel} · {book.genre}
                  </Badge>
                </div>
              </div>
            </div>

            {/* 梗概定稿区 */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-foreground">梗概定稿</span>
                <div className="flex items-center gap-2">
                  {displayContent && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={handleExport}
                    >
                      <Download className="size-3.5 mr-1" />
                      导出
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => setIsImportMode(!isImportMode)}
                  >
                    <Import className="size-3.5 mr-1" />
                    {isImportMode ? '取消导入' : '导入已有梗概'}
                  </Button>
                </div>
              </div>

              {isImportMode && (
                <div className="rounded-lg border border-dashed border-primary/30 bg-primary/5 p-3">
                  <p className="text-xs text-muted-foreground mb-2">粘贴已有梗概，AI 将基于此优化重写</p>
                  <Textarea
                    value={existingSynopsis}
                    onChange={(e) => setExistingSynopsis(e.target.value)}
                    placeholder="在此粘贴你的已有故事梗概..."
                    className="min-h-[100px] resize-none text-sm bg-background/60"
                  />
                </div>
              )}

              <div className="rounded-lg border border-border/60 bg-background/40 p-4 min-h-[200px] max-h-[350px] overflow-y-auto">
                {displayContent || isGenerating ? (
                  <article className="prose prose-sm max-w-none prose-p:leading-relaxed prose-p:text-foreground/90 prose-p:my-3 prose-headings:text-foreground dark:prose-invert">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{displayContent}</ReactMarkdown>
                    {isGenerating && (
                      <span className="inline-block w-1.5 h-5 bg-primary/60 ml-1 animate-pulse align-middle" />
                    )}
                  </article>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center py-8 text-muted-foreground">
                    <BookOpen className="size-8 text-primary/40 mb-3" />
                    <p className="text-sm">点击右侧「开始生成」生成故事梗概</p>
                  </div>
                )}
              </div>
            </div>

            {/* 创意补充 */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Lightbulb className="size-4 text-primary" />
                创意补充
              </div>
              <Textarea
                value={creativeIdeas}
                onChange={(e) => setCreativeIdeas(e.target.value)}
                placeholder="描述你的创意灵感、关键情节设定、想要的故事走向..."
                className="min-h-[80px] resize-none bg-background/40"
                disabled={isGenerating}
              />
            </div>

            {/* 参考文档上传 */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <FileText className="size-4 text-primary" />
                参考文档
                <span className="text-[11px] text-muted-foreground font-normal">
                  支持 .txt，最多 5 个，单个不超过 10MB
                </span>
              </div>

              {uploadedFiles.length > 0 && (
                <div className="space-y-1.5">
                  {uploadedFiles.map((file, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg bg-background/60 border border-border/60 text-sm"
                    >
                      <FileText className="size-4 text-muted-foreground shrink-0" />
                      <span className="flex-1 truncate text-foreground">{file.name}</span>
                      <span className="text-xs text-muted-foreground shrink-0">
                        {(file.size / 1024).toFixed(0)} KB
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-6 text-muted-foreground hover:text-destructive shrink-0"
                        onClick={() => removeFile(idx)}
                      >
                        <X className="size-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              <div
                onClick={() => fileInputRef.current?.click()}
                className="border border-dashed border-border/80 rounded-lg p-4 text-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-colors"
              >
                <Upload className="size-5 text-muted-foreground mx-auto mb-1.5" />
                <p className="text-xs text-muted-foreground">
                  点击上传参考文档，或拖拽文件到此处
                </p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".txt,.md"
                multiple
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>
            {/* 生成按钮 */}
            <div className="pt-2">
              <Button
                onClick={handleGenerate}
                disabled={isGenerating}
                className="w-full h-11 bg-gradient-to-r from-primary to-emerald-500 text-primary-foreground hover:from-primary/90 hover:to-emerald-500/90 shadow-md shadow-primary/20 font-medium"
              >
                {isGenerating ? (
                  <>
                    <Sparkles className="size-4 mr-2 animate-spin" />
                    生成中...
                  </>
                ) : (
                  <>
                    <BookOpen className="size-4 mr-2" />
                    开始生成故事梗概
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
