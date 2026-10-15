import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { capabilityClient, logger } from '@lark-apaas/client-toolkit-lite';
import {
  Wand2,
  Sparkles,
  Loader2,
  Copy,
  RefreshCw,
  FileText,
  CheckCircle,
  Lightbulb,
  AlignLeft,
  Palette,
  Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

const NOVEL_GENERATOR_ID = 'ai_novel_generate_1';

const PRESETS = [
  {
    key: 'natural',
    label: '自然口语化',
    desc: '让文字更像真人说话',
  },
  {
    key: 'literary',
    label: '文学质感',
    desc: '增加文学性与文采',
  },
  {
    key: 'concise',
    label: '简洁精炼',
    desc: '去除冗余，更利落',
  },
  {
    key: 'emotional',
    label: '情感丰富',
    desc: '增强情绪感染力',
  },
];

const FEATURES = [
  { icon: AlignLeft, text: '句式多样化' },
  { icon: Palette, text: '词汇更丰富' },
  { icon: Zap, text: '节奏更自然' },
  { icon: Lightbulb, text: '去模板化表达' },
];

export default function OptimizePage() {
  const [inputText, setInputText] = useState('');
  const [outputText, setOutputText] = useState('');
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [preset, setPreset] = useState('natural');

  const handleOptimize = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim()) {
      toast.warning('请先粘贴需要优化的文本');
      return;
    }

    setIsOptimizing(true);
    setOutputText('');
    toast.loading('正在优化文本...', { id: 'optimize-loading' });

    const presetMap: Record<string, string> = {
      natural: '让文本更自然、更像真人写作，减少 AI 模板化痕迹，增加口语化表达和自然的语气变化。',
      literary: '提升文学质感，增强文采和修辞，让文字更有韵味和画面感，同时保持自然真实。',
      concise: '让文字更简洁精炼，去除冗余表达和废话，节奏更明快，读起来更利落。',
      emotional: '增强情感表达和感染力，让文字更有温度、更能打动读者，减少 AI 的冰冷感。',
    };

    const customReq = presetMap[preset] || presetMap.natural;
    const instruction = `你是一位资深文字编辑，擅长把 AI 生成的文本改写成更自然、更像真人写作的风格。

【待优化文本】
${inputText}

【优化要求】
${customReq}

请直接输出优化后的完整文本，不要解释，不要加标题，保持原文的段落结构和核心含义。`;

    let chunkCount = 0;
    try {
      logger.info('[Optimize] start, preset=', preset, 'len=', inputText.length);
      const executor = capabilityClient.load(NOVEL_GENERATOR_ID);
      const stream = executor.callStream('textGenerate', {
        genre: '现代文学',
        novel_type: '短篇',
        setting: '一段需要润色改写的文本',
        characters: '无特定人物',
        style: '自然流畅的编辑润色风格',
        additional_requirements: instruction,
      });
      logger.info('[Optimize] stream obtained, iterating...');
      for await (const chunk of stream) {
        const c = chunk as Record<string, unknown>;
        const piece =
          (c.content as string) ??
          (c.response as string) ??
          (c.text as string) ??
          '';
        if (piece) {
          chunkCount += 1;
          setOutputText((prev) => prev + piece);
        }
      }
      logger.info('[Optimize] done, chunks=', chunkCount);
      toast.dismiss('optimize-loading');
      if (chunkCount === 0) {
        toast.error('优化结果为空，请稍后重试');
        return;
      }
      toast.success('去 AI 味优化完成');
    } catch (error) {
      logger.error('[Optimize] failed:', String(error));
      toast.dismiss('optimize-loading');
      toast.error(`优化失败：${String(error).slice(0, 100)}`);
    } finally {
      setIsOptimizing(false);
    }
  };

  const handleCopy = async () => {
    if (!outputText) return;
    try {
      await navigator.clipboard.writeText(outputText);
      toast.success('已复制优化结果');
    } catch {
      toast.error('复制失败');
    }
  };

  const handleSwap = () => {
    if (!outputText) return;
    setInputText(outputText);
    setOutputText('');
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-br from-background via-pink-500/5 to-background">
      <div className="max-w-[1600px] mx-auto px-4 md:px-6 py-8">
        {/* 页头 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-8"
        >
          <Badge variant="outline" className="mb-4 border-pink-400/30 text-pink-300 bg-pink-500/10">
            <Wand2 className="size-3 mr-1" />
            去 AI 味优化
          </Badge>
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-3">
            让文字回归人的温度
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            AI 生成的文字总觉得少点灵魂？一键去 AI 味优化，
            让表达更自然、更真实、更像你亲手写下的文字。
          </p>
        </motion.div>

        {/* 优化特色 */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-3xl mx-auto mb-8"
        >
          {FEATURES.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.text}
                className="flex items-center gap-2 p-3 rounded-xl bg-card/50 border border-primary/10"
              >
                <div className="size-8 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
                  <Icon className="size-4 text-primary" />
                </div>
                <span className="text-sm text-foreground">{item.text}</span>
              </div>
            );
          })}
        </motion.div>

        {/* 风格选择 */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="mb-6 max-w-3xl mx-auto"
        >
          <Tabs value={preset} onValueChange={setPreset} className="w-full">
            <TabsList className="w-full h-auto flex flex-wrap p-1 bg-card/50">
              {PRESETS.map((p) => (
                <TabsTrigger
                  key={p.key}
                  value={p.key}
                  className="flex-1 min-w-[140px] py-2.5 data-[state=active]:bg-primary/20 data-[state=active]:text-primary"
                >
                  <Sparkles className="size-4 mr-1.5" />
                  {p.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          <p className="text-center text-sm text-muted-foreground mt-2">
            {PRESETS.find((p) => p.key === preset)?.desc}
          </p>
        </motion.div>

        {/* 主内容区 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 左侧：输入 */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Card className="h-full border-pink-400/15">
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="size-5 text-primary" />
                  原始文本
                </CardTitle>
                <span className="text-xs text-muted-foreground">
                  {inputText.length} 字
                </span>
              </CardHeader>
              <CardContent className="space-y-3">
                <form onSubmit={handleOptimize} className="space-y-3">
                  <Textarea
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder="粘贴 AI 生成的文本，点击右侧按钮即可去 AI 味优化..."
                    className="min-h-[400px] resize-none text-sm leading-relaxed"
                  />
                  <Button
                    type="submit"
                    data-optimize-btn
                    className="w-full h-11 bg-gradient-to-r from-pink-500 to-purple-500 text-white hover:from-pink-500/90 hover:to-purple-500/90 shadow-md shadow-pink-500/20 font-semibold no-default-hover-elevate no-default-active-elevate"
                    disabled={isOptimizing}
                  >
                    {isOptimizing ? (
                      <>
                        <Loader2 className="size-4 mr-2 animate-spin" />
                        优化中...
                      </>
                    ) : (
                      <>
                        <Wand2 className="size-4 mr-2" />
                        开始去 AI 味
                      </>
                    )}
                  </Button>
                  {!inputText.trim() && !isOptimizing && (
                    <p className="text-xs text-muted-foreground text-center mt-2">
                      请先粘贴需要优化的文本
                    </p>
                  )}
                </form>
              </CardContent>
            </Card>
          </motion.div>

          {/* 右侧：输出 */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <Card className="h-full border-pink-400/15">
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <CheckCircle className="size-5 text-primary" />
                  优化结果
                  {isOptimizing && (
                    <Badge variant="outline" className="ml-2 text-xs border-primary/30 text-primary">
                      <Loader2 className="size-3 mr-1 animate-spin" />
                      润色中
                    </Badge>
                  )}
                </CardTitle>
                {outputText && (
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 text-muted-foreground hover:text-foreground"
                      onClick={handleSwap}
                      title="用优化结果替换输入"
                    >
                      <RefreshCw className="size-4 mr-1" />
                      替换输入
                    </Button>
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
                <div className="h-[470px] overflow-y-auto p-6 bg-gradient-to-b from-card/20 to-background/20">
                  <AnimatePresence mode="wait">
                    {!outputText && !isOptimizing ? (
                      <motion.div
                        key="empty"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="h-full flex flex-col items-center justify-center text-center py-16"
                      >
                        <div className="relative mb-6">
                          <div className="absolute inset-0 bg-pink-500/20 blur-2xl rounded-full scale-150" />
                          <div className="relative size-24 flex items-center justify-center">
                            <Wand2 className="size-16 text-primary/60" />
                          </div>
                        </div>
                        <h3 className="text-xl font-semibold text-foreground mb-2">
                          等待优化魔法
                        </h3>
                        <p className="text-muted-foreground max-w-sm text-sm leading-relaxed">
                          在左侧输入 AI 生成的文本，选择优化风格，点击按钮即可获得
                          更自然、更真实的人类化写作效果。
                        </p>
                      </motion.div>
                    ) : (
                      <motion.article
                        key="result"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.4 }}
                        className="prose prose-sm max-w-none dark:prose-invert"
                      >
                        {outputText.split('\n').map((paragraph, i) =>
                          paragraph.trim() ? (
                            <p key={i}>{paragraph}</p>
                          ) : (
                            <br key={i} />
                          )
                        )}
                        {isOptimizing && (
                          <span className="inline-block w-2 h-5 bg-primary/60 ml-1 animate-pulse align-middle" />
                        )}
                      </motion.article>
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
