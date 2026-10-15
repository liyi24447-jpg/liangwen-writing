import { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Users, Crown, User, RefreshCw, Plus, Sparkles } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { toast } from 'sonner';
import type { IBookWork, ICharacterProfile } from '@/data/novel';
import { generateCharacterProfiles } from '@/lib/novel-generator';
import { saveBookOptimistic } from '@/lib/save-helper';

interface CharactersStageProps {
  book: IBookWork;
  onBookUpdate: (book: IBookWork) => void;
}

export default function CharactersStage({ book, onBookUpdate }: CharactersStageProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [displayContent, setDisplayContent] = useState('');
  const [details, setDetails] = useState<Record<string, string>>({});

  const characters = book.characterProfiles || [];
  const selected = characters[selectedIndex];

  const handleGenerate = async () => {
    if (!book.synopsis?.trim() && !book.styleDescription?.trim()) {
      toast.warning('请先填写故事梗概或风格提示');
      return;
    }
    setIsGenerating(true);
    setDisplayContent('');
    try {
      const result = await generateCharacterProfiles(
        book.genre,
        book.title,
        book.synopsis,
        book.outline || '',
        (piece) => {
          setDisplayContent((prev) => prev + piece);
        },
        book.styleGuide || book.styleDescription || ''
      );
      if (result.length === 0) {
        toast.error('人物小传解析失败，请重新生成');
      } else {
        const updated = { ...book, characterProfiles: result };
        const saved = await saveBookOptimistic(updated, onBookUpdate, { silent: true });
        if (saved) {
          toast.success(`生成了 ${result.length} 位人物小传，已自动保存`);
        } else {
          toast.warning('人物小传已生成，但保存失败');
        }
        setSelectedIndex(0);
      }
    } catch {
      // error handled
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAddCharacter = () => {
    const ts = Date.now();
    const newChar: ICharacterProfile = {
      id: `char_custom_${ts}`,
      name: '新人物',
      identity: '配角',
      personality: '',
      background: '',
      description: '',
      appearance: '',
      gender: 'other',
      relationships: '',
      characterArc: '',
      keyTraits: '',
      extraFields: [],
    };
    const updated = {
      ...book,
      characterProfiles: [...characters, newChar],
    };
    onBookUpdate(updated);
    setSelectedIndex(characters.length);
  };

  const getIdentityBadge = (identity?: string) => {
    if (!identity) return <Badge variant="outline" className="text-muted-foreground">人物</Badge>;
    const lower = identity.toLowerCase();
    if (lower.includes('主角') || lower.includes('女主') || lower.includes('男主'))
      return <Badge className="bg-primary/20 text-primary border-0">主角</Badge>;
    if (lower.includes('反派')) return <Badge className="bg-amber-100 text-amber-700 border-0">反派</Badge>;
    if (lower.includes('配')) return <Badge variant="outline" className="text-muted-foreground">配角</Badge>;
    return <Badge variant="outline">{identity}</Badge>;
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
              <Users className="size-5 text-primary" />
              人物小传
            </CardTitle>
            <p className="text-xs text-muted-foreground leading-relaxed mt-1">
              基于故事大纲生成主要人物的详细设定，包括性格、背景、关系、成长弧光等。
            </p>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            {characters.length > 0 ? (
              <>
                {/* 人物列表 */}
                <div className="flex flex-wrap gap-2">
                  {characters.map((char, idx) => (
                    <button
                      key={char.id}
                      onClick={() => setSelectedIndex(idx)}
                      className={`px-3 py-1.5 rounded-lg text-sm flex items-center gap-1.5 transition-all ${
                        selectedIndex === idx
                          ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20'
                          : 'bg-background/50 border border-border/60 text-foreground hover:border-primary/40'
                      }`}
                    >
                      {char.identity?.includes('主角') || char.identity?.includes('女主') || char.identity?.includes('男主') ? (
                        <Crown className="size-3.5" />
                      ) : (
                        <User className="size-3.5" />
                      )}
                      {char.name}
                    </button>
                  ))}
                   <button
                     onClick={handleAddCharacter}
                     className="px-3 py-1.5 rounded-lg text-sm border border-dashed border-border/80 text-muted-foreground hover:border-primary/50 hover:text-primary transition-all flex items-center gap-1.5"
                   >
                     <Plus className="size-3.5" />
                     添加
                   </button>
                </div>

                {/* 人物详情 */}
                {selected && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-bold text-foreground">{selected.name}</span>
                        {getIdentityBadge(selected.identity)}
                      </div>
                    </div>
                    {selected.personality && (
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-muted-foreground shrink-0">性格</span>
                        <span className="font-medium">{selected.personality}</span>
                      </div>
                    )}
                    {selected.appearance && (
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-muted-foreground shrink-0">外貌</span>
                        <span className="font-medium">{selected.appearance}</span>
                      </div>
                    )}
                    {selected.relationships && (
                      <div className="flex gap-2 text-sm">
                        <span className="text-muted-foreground shrink-0">人物关系</span>
                        <span className="font-medium flex-1">{selected.relationships}</span>
                      </div>
                    )}
                    {selected.characterArc && (
                      <div className="flex gap-2 text-sm">
                        <span className="text-muted-foreground shrink-0">成长弧光</span>
                        <span className="font-medium flex-1">{selected.characterArc}</span>
                      </div>
                    )}
                    <div className="rounded-lg border border-border/60 bg-background/40 p-4 max-h-[350px] overflow-y-auto">
                      <article className="prose prose-sm max-w-none prose-p:leading-relaxed prose-p:text-foreground/90 prose-p:my-2 dark:prose-invert">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {selected.background || selected.description || '人物详细介绍...'}
                        </ReactMarkdown>
                      </article>
                    </div>
                  </div>
                )}

                <div className="pt-2 border-t border-border/60">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs"
                    onClick={handleGenerate}
                    disabled={isGenerating}
                  >
                    <RefreshCw className={`size-3.5 mr-1 ${isGenerating ? 'animate-spin' : ''}`} />
                    重新生成人物
                  </Button>
                </div>
              </>
            ) : isGenerating ? (
              <div className="py-12 text-center">
                <Sparkles className="size-8 text-primary animate-spin mx-auto mb-3" />
                <p className="text-sm text-muted-foreground mb-4">正在生成人物小传...</p>
                <div className="rounded-lg border border-border/60 bg-background/40 p-4 text-left text-xs text-muted-foreground max-h-[200px] overflow-y-auto whitespace-pre-wrap">
                  {displayContent}
                </div>
              </div>
            ) : (
              <div className="py-12 text-center">
                <Users className="size-10 text-primary/40 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground mb-2">还没有人物小传</p>
                <p className="text-xs text-muted-foreground/70">
                  在右侧「人物管理」面板点击「开始生成人物」
                  <br />
                  AI 即可批量生成主要人物设定
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
