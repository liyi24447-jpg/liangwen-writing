import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  BookOpen,
  Upload,
  FileText,
  Sparkles,
  Loader2,
  Copy,
  Lightbulb,
  PenTool,
  Star,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { analyzeBook } from '@/lib/novel-generator';

export default function DisassemblePage() {
  const [inputText, setInputText] = useState('');
  const [result, setResult] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('文件大小不能超过 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      setInputText(text);
      toast.success(`已加载 ${file.name}`);
    };
    reader.onerror = () => {
      toast.error('文件读取失败');
    };
    reader.readAsText(file);
  };

  const handleAnalyze = async () => {
    if (!inputText.trim()) {
      toast.warning('请先输入或上传文章内容');
      return;
    }
    if (inputText.trim().length < 100) {
      toast.warning('文章内容过短，至少需要 100 字');
      return;
    }

    setIsAnalyzing(true);
    setResult('');

    try {
      await analyzeBook(inputText, (piece) => {
        setResult((prev) => prev + piece);
      });
      toast.success('拆书分析完成');
    } catch {
      // error handled in generator
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleCopy = async () => {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result);
      toast.success('已复制分析结果');
    } catch {
      toast.error('复制失败');
    }
  };

  const handleUseForCreation = () => {
    if (!result) return;
    // 将分析结果作为创作提示，跳转去创作页
    toast.info('分析结果已可用于创作参考');
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-br from-background via-purple-500/5 to-background">
      <div className="max-w-[1600px] mx-auto px-4 md:px-6 py-8">
        {/* 页头 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-10"
        >
          <Badge variant="outline" className="mb-4 border-purple-400/30 text-purple-300 bg-purple-500/10">
            <BookOpen className="size-3 mr-1" />
            拆书分析
          </Badge>
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-3">
            深度拆解优秀作品
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            上传或粘贴任意文章/小说，AI 自动拆解书名、简介、开篇手法、文风特征与创作提示，
            把别人的作品变成你的创作灵感宝库。
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 左侧：输入区 */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <Card className="h-full border-purple-400/15">
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="size-5 text-primary" />
                  输入文章内容
                </CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-primary/30 text-foreground hover:bg-primary/10"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="size-4 mr-1.5" />
                  上传文件
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".txt,.md,.html,.doc,.docx"
                  className="hidden"
                  onChange={handleFileUpload}
                />
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="在此粘贴文章或小说内容，也可以点击上方按钮上传 .txt / .md 等文本文件..."
                  className="min-h-[420px] resize-none font-sans text-sm leading-relaxed"
                />
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    共 {inputText.length} 字
                  </span>
                  <Button
                    className="bg-gradient-to-r from-primary to-purple-500 text-primary-foreground hover:from-primary/90 hover:to-purple-500/90 shadow-md shadow-primary/20"
                    onClick={handleAnalyze}
                    disabled={isAnalyzing || !inputText.trim()}
                  >
                    {isAnalyzing ? (
                      <>
                        <Loader2 className="size-4 mr-2 animate-spin" />
                        分析中...
                      </>
                    ) : (
                      <>
                        <Sparkles className="size-4 mr-2" />
                        开始拆书
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* 右侧：结果区 */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Card className="h-full border-purple-400/15">
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Lightbulb className="size-5 text-primary" />
                  拆书分析结果
                  {isAnalyzing && (
                    <Badge variant="outline" className="ml-2 text-xs border-primary/30 text-primary">
                      <Loader2 className="size-3 mr-1 animate-spin" />
                      AI 拆解中
                    </Badge>
                  )}
                </CardTitle>
                {result && (
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 text-muted-foreground hover:text-foreground"
                      onClick={handleCopy}
                    >
                      <Copy className="size-4 mr-1" />
                      复制
                    </Button>
                  </div>
                )}
              </CardHeader>
              <CardContent className="p-0">
                <div className="h-[500px] overflow-y-auto p-6 bg-gradient-to-b from-card/20 to-background/20">
                  <AnimatePresence mode="wait">
                    {!result && !isAnalyzing ? (
                      <motion.div
                        key="empty"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="h-full flex flex-col items-center justify-center text-center py-16"
                      >
                        <div className="relative mb-6">
                          <div className="absolute inset-0 bg-purple-500/20 blur-2xl rounded-full scale-150" />
                          <div className="relative size-24 flex items-center justify-center">
                            <BookOpen className="size-16 text-primary/60" />
                          </div>
                        </div>
                        <h3 className="text-xl font-semibold text-foreground mb-2">
                          准备好拆解好书了吗？
                        </h3>
                        <p className="text-muted-foreground max-w-sm text-sm leading-relaxed mb-4">
                          粘贴或上传你想学习的作品，AI 将从书名、简介、开篇、文风等多维度深度拆解，
                          为你提炼创作要点。
                        </p>
                        <div className="grid grid-cols-2 gap-2 max-w-xs">
                          {[
                            { icon: Star, text: '书名提炼' },
                            { icon: Lightbulb, text: '开篇分析' },
                            { icon: PenTool, text: '文风解析' },
                            { icon: Sparkles, text: '创作提示' },
                          ].map((item) => {
                            const Icon = item.icon;
                            return (
                              <div
                                key={item.text}
                                className="flex items-center gap-2 p-2 rounded-lg bg-primary/5 border border-primary/10"
                              >
                                <Icon className="size-4 text-primary shrink-0" />
                                <span className="text-xs text-foreground">{item.text}</span>
                              </div>
                            );
                          })}
                        </div>
                      </motion.div>
                    ) : (
                      <motion.div
                        key="result"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.4 }}
                        className="prose prose-sm max-w-none dark:prose-invert"
                      >
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{result}</ReactMarkdown>
                        {isAnalyzing && (
                          <span className="inline-block w-2 h-5 bg-primary/60 ml-1 animate-pulse align-middle" />
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
