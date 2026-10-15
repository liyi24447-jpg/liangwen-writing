import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  TrendingUp,
  Crown,
  Medal,
  Award,
  Flame,
  BookOpen,
  Star,
  ExternalLink,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  HOT_RANK_PLATFORMS,
  MOCK_RANK_DATA,
  type IRankBook,
  type IRankPlatform,
} from '@/data/novel';

const rankIcons = [Crown, Medal, Award];

export default function HotRankPage() {
  const [activePlatform, setActivePlatform] = useState(HOT_RANK_PLATFORMS[0].id);

  const books: IRankBook[] = useMemo(() => {
    return MOCK_RANK_DATA[activePlatform] || [];
  }, [activePlatform]);

  const platformInfo: IRankPlatform | undefined = HOT_RANK_PLATFORMS.find(
    (p) => p.id === activePlatform
  );

  const getBookSearchUrl = (book: IRankBook) => {
    if (!platformInfo) return '#';
    return `${platformInfo.searchUrl}${encodeURIComponent(book.title)}`;
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-br from-background via-primary/5 to-background">
      <div className="max-w-6xl mx-auto px-4 md:px-6 py-8">
        {/* 页头 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-8"
        >
          <Badge
            variant="outline"
            className="mb-4 border-primary/30 text-primary bg-primary/10"
          >
            <TrendingUp className="size-3 mr-1" />
            网文扫榜
          </Badge>
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-3">
            全网小说热榜
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            聚合六大主流网文平台热销榜单，洞察热门题材、风格趋势与读者偏好，
            让创作方向更精准。
          </p>
        </motion.div>

        {/* 平台切换 */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mb-6"
        >
          <Tabs
            value={activePlatform}
            onValueChange={setActivePlatform}
            className="w-full"
          >
            <TabsList className="w-full h-auto flex flex-wrap p-1 bg-card/50">
              {HOT_RANK_PLATFORMS.map((platform) => (
                <TabsTrigger
                  key={platform.id}
                  value={platform.id}
                  className="flex-1 min-w-[120px] py-2.5 data-[state=active]:bg-primary/15 data-[state=active]:text-primary"
                >
                  <Flame className="size-4 mr-1.5" />
                  {platform.name}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </motion.div>

        {/* 榜单内容 */}
        <motion.div
          key={activePlatform}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <Card className="border-primary/10">
            <CardHeader className="pb-4 flex flex-row items-center justify-between border-b border-border/50">
              <CardTitle className="text-xl flex items-center gap-2">
                <TrendingUp className="size-5 text-primary" />
                {platformInfo?.name}
                <Badge variant="secondary" className="ml-2">
                  TOP 10
                </Badge>
              </CardTitle>
              <span className="text-sm text-muted-foreground">
                热销榜 · 点击前往平台查看实时数据
              </span>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border/50">
                {books.map((book, index) => {
                  const RankIcon = rankIcons[index] || Star;
                  const rankColor =
                    index === 0
                      ? 'text-yellow-500'
                      : index === 1
                        ? 'text-slate-400'
                        : index === 2
                          ? 'text-amber-600'
                          : 'text-muted-foreground';

                  return (
                    <motion.div
                      key={book.rank}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.04 }}
                      className="flex items-center gap-4 p-4 md:p-5 hover:bg-primary/5 transition-colors group"
                    >
                      {/* 排名 */}
                      <div className="flex items-center justify-center size-10 shrink-0">
                        <RankIcon className={`size-5 ${rankColor}`} />
                        <span className={`text-base font-bold ml-0.5 ${rankColor}`}>
                          {index + 1}
                        </span>
                      </div>

                      {/* 书籍信息 */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-foreground truncate">
                            {book.title}
                          </h3>
                        </div>
                        <p className="text-sm text-muted-foreground truncate mb-1">
                          {book.author} · {book.genre}
                        </p>
                        <p className="text-xs text-muted-foreground/80 line-clamp-1">
                          {book.description}
                        </p>
                      </div>

                      {/* 热度/状态 + 跳转按钮 */}
                      <div className="flex flex-col items-end gap-2 shrink-0">
                        <div className="hidden sm:flex items-center gap-2">
                          <Badge
                            variant={index < 3 ? 'default' : 'secondary'}
                            className={
                              index < 3
                                ? 'bg-gradient-to-r from-primary to-emerald-500 text-primary-foreground border-0'
                                : ''
                            }
                          >
                            <BookOpen className="size-3 mr-1" />
                            {book.status}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground hidden sm:inline">
                            {book.hot} 热度
                          </span>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs gap-1 border-primary/20 text-primary hover:bg-primary/10"
                            onClick={() => {
                              window.open(getBookSearchUrl(book), '_blank', 'noreferrer');
                            }}
                          >
                            <ExternalLink className="size-3" />
                            前往查看
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* 说明 */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.6 }}
          className="text-center text-xs text-muted-foreground mt-6"
        >
          榜单数据为演示用例，点击「前往查看」将跳转至对应网文平台实时搜索页
        </motion.p>
      </div>
    </div>
  );
}
