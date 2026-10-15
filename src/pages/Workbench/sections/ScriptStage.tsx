import { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ScrollText,
  Sparkles,
  RefreshCw,
  Download,
  Copy,
  BookMarked,
  ChevronDown,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { toast } from 'sonner';
import type { IBookWork } from '@/data/novel';
import { generateScript, buildBookContextPrompt } from '@/lib/novel-generator';
import { saveBookOptimistic } from '@/lib/save-helper';

interface ScriptStageProps {
  book: IBookWork;
  onBookUpdate?: (book: IBookWork) => void;
}

export default function ScriptStage({ book, onBookUpdate }: ScriptStageProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [displayContent, setDisplayContent] = useState(book.scriptContent || '');
  const [customReq, setCustomReq] = useState('');
  const [selectedChapterIdx, setSelectedChapterIdx] = useState(0);
  const [showChapterSelect, setShowChapterSelect] = useState(false);

  const chaptersWithContent = book.chapters.filter((c) => c.content?.trim());
  const sourceChapter = chaptersWithContent[selectedChapterIdx] || book.chapters[0];

  const handleGenerate = async () => {
    if (!sourceChapter?.content?.trim()) {
      toast.warning('请先在正文生成中创作章节内容，再转换为剧本');
      return;
    }
    setIsGenerating(true);
    setDisplayContent('');
    try {
      const bookContext = buildBookContextPrompt(book);
      const full = await generateScript(
        {
          genre: book.genre,
          title: book.title || '未命名作品',
          chapterTitle: sourceChapter.title,
          chapterContent: sourceChapter.content,
          styleGuide: book.styleGuide || '',
          customRequirements: customReq,
        },
        (piece) => {
          setDisplayContent((prev) => prev + piece);
        },
        bookContext
      );
      const updated = { ...book, scriptContent: full };
      onBookUpdate?.(updated);
      toast.success('剧本生成完成');
    } catch {
      // error handled
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = async () => {
    if (!displayContent) return;
    try {
      await navigator.clipboard.writeText(displayContent);
      toast.success('已复制到剪贴板');
    } catch {
      toast.error('复制失败');
    }
  };

  const handleExport = () => {
    if (!displayContent) return;
    const blob = new Blob([displayContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${book.title || '剧本'}.txt`;
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
              <ScrollText className="size-5 text-primary" />
              剧本生成
            </CardTitle>
            <p className="text-xs text-muted-foreground leading-relaxed mt-1">
              一键将小说章节转换为专业剧本格式，包含场景描述、角色台词、动作指示等。
            </p>
          </CardHeader>
          <CardContent className="p-6 space-y-5">
            {/* 源章节选择 */}
            <div className="space-y-2">
              <span className="text-sm font-medium text-foreground">选择源章节</span>
              {chaptersWithContent.length > 0 ? (
                <div className="relative">
                  <button
                    onClick={() => setShowChapterSelect(!showChapterSelect)}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-lg border border-border/60 bg-background/40 text-sm text-left hover:border-primary/40 transition-colors"
                  >
                    <span className="truncate">
                      {sourceChapter?.title || '选择章节'}
                    </span>
                    <ChevronDown
                      className={`size-4 text-muted-foreground shrink-0 transition-transform ${showChapterSelect ? 'rotate-180' : ''}`}
                    />
                  </button>
                  {showChapterSelect && (
                    <div className="absolute z-10 w-full mt-1 max-h-48 overflow-y-auto rounded-lg border border-border/60 bg-card shadow-lg">
                      {chaptersWithContent.map((ch, idx) => (
                        <button
                          key={ch.id}
                          onClick={() => {
                            setSelectedChapterIdx(idx);
                            setShowChapterSelect(false);
                          }}
                          className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-primary/10 transition-colors ${selectedChapterIdx === idx ? 'bg-primary/10 text-primary' : 'text-foreground'}`}
                        >
                          <BookMarked className="size-3.5 shrink-0 text-muted-foreground" />
                          <span className="flex-1 truncate">{ch.title}</span>
                          <span className="text-xs text-muted-foreground tabular-nums shrink-0">
                            {ch.wordCount} 字
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-border/60 bg-background/20 p-4 text-center">
                  <p className="text-xs text-muted-foreground">
                    暂无已完成章节，请先在「正文生成」中创作章节内容
                  </p>
                </div>
              )}
            </div>

            {/* 剧本结果 */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-foreground">剧本内容</span>
                {displayContent && !isGenerating && (
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={handleCopy}>
                      <Copy className="size-3.5 mr-1" />
                      复制
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={handleExport}>
                      <Download className="size-3.5 mr-1" />
                      导出
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={handleGenerate}>
                      <RefreshCw className="size-3.5 mr-1" />
                      重新生成
                    </Button>
                  </div>
                )}
              </div>
              <div className="rounded-lg border border-border/60 bg-background/40 p-5 min-h-[300px] max-h-[500px] overflow-y-auto">
                {displayContent || isGenerating ? (
                  <article className="prose prose-sm max-w-none prose-p:leading-relaxed prose-p:text-foreground/90 prose-p:my-2 prose-headings:text-foreground dark:prose-invert">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{displayContent}</ReactMarkdown>
                    {isGenerating && (
                      <span className="inline-block w-1.5 h-5 bg-primary/60 ml-1 animate-pulse align-middle" />
                    )}
                  </article>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center py-12 text-muted-foreground">
                    <ScrollText className="size-8 text-primary/40 mb-3" />
                    <p className="text-sm">选择章节后点击「开始生成」转换为剧本</p>
                  </div>
                )}
              </div>
            </div>

            {/* 自定义要求 */}
            <div className="space-y-2">
              <span className="text-sm font-medium text-foreground">转换偏好（可选）</span>
              <Textarea
                value={customReq}
                onChange={(e) => setCustomReq(e.target.value)}
                placeholder="例如：偏影视化剧本风格、增加分镜描述、强调对白、适合短剧呈现..."
                className="min-h-[70px] resize-none bg-background/40 text-sm"
                disabled={isGenerating}
              />
            </div>

            {/* 生成按钮 */}
            <div className="pt-2">
              <Button
                onClick={handleGenerate}
                disabled={isGenerating || !sourceChapter?.content?.trim()}
                className="w-full h-11 bg-gradient-to-r from-primary to-emerald-500 text-primary-foreground hover:from-primary/90 hover:to-emerald-500/90 shadow-md shadow-primary/20 font-medium"
              >
                {isGenerating ? (
                  <>
                    <Sparkles className="size-4 mr-2 animate-spin" />
                    生成中...
                  </>
                ) : (
                  <>
                    <ScrollText className="size-4 mr-2" />
                    生成剧本
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
