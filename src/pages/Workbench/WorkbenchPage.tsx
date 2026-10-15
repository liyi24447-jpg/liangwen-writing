import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import {
  Menu,
  BookMarked,
  BarChart3,
  Library,
  Home,
} from 'lucide-react';
import WorkbenchSidebar from './WorkbenchSidebar';
import WorkbenchToolbar from './WorkbenchToolbar';
import WorkModePanel from './WorkModePanel';
import OverviewStage from './sections/OverviewStage';
import StyleStage from './sections/StyleStage';
import SynopsisStage from './sections/SynopsisStage';
import TitlesStage from './sections/TitlesStage';
import BlurbStage from './sections/BlurbStage';
import OutlineStage from './sections/OutlineStage';
import CharactersStage from './sections/CharactersStage';
import VolumesStage from './sections/VolumesStage';
import ChaptersStage from './sections/ChaptersStage';
import BodyStage from './sections/BodyStage';
import ScriptStage from './sections/ScriptStage';
import type { WorkStageKey } from './stages';
import { STAGES, PHASE_LABELS, computeCompletedStages } from './stages';
import type { IBookWork, IChapter } from '@/data/novel';
import { getBook, saveBook } from '@/lib/novel-generator';
import { toast } from 'sonner';
import { logger } from '@lark-apaas/client-toolkit-lite';

export default function WorkbenchPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [book, setBook] = useState<IBookWork | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentStage, setCurrentStage] = useState<WorkStageKey>('overview');
  const [selectedChapterId, setSelectedChapterId] = useState<string | null>(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // 加载书籍
  useEffect(() => {
    if (!id) {
      navigate('/library');
      return;
    }
    let mounted = true;
    (async () => {
      const b = await getBook(id);
      if (!mounted) return;
      if (!b) {
        toast.error('作品不存在');
        navigate('/library');
        return;
      }
      setBook(b);
      setLoading(false);
      // 根据完成度决定初始阶段
      const completed = computeCompletedStages(b);
      if (completed.size === 0) {
        setCurrentStage('style');
      }
    })();
    return () => { mounted = false; };
  }, [id, navigate]);

  const handleBookUpdate = useCallback((updated: IBookWork) => {
    setBook(updated);
  }, []);

  // 全局兜底自动保存：book 变化后延迟持久化
  // 各 Stage 会显式调用 saveBookOptimistic，这里做最后兜底防线
  useEffect(() => {
    if (!book || loading) return;
    const bookId = book.id;
    const timer = setTimeout(async () => {
      try {
        const saved = await saveBook(book);
        if (saved) {
          logger.info('[Workbench] 兜底自动保存成功', { bookId, updatedAt: saved.updatedAt });
        } else {
          logger.error('[Workbench] 兜底自动保存失败', { bookId });
        }
      } catch (e) {
        logger.error('[Workbench] 兜底自动保存异常:', String(e));
      }
    }, 5000);
    return () => clearTimeout(timer);
  }, [book, loading]);

  const handleStageChange = useCallback((stage: WorkStageKey) => {
    setCurrentStage(stage);
    setMobileNavOpen(false);
    if (stage === 'body') {
      // 用函数式更新读取最新 book 状态，避免闭包滞后
      setBook((prevBook) => {
        if (!prevBook) return prevBook;
        const firstDraft = prevBook.chapters.find((c) => !c.content);
        const chapterId = firstDraft?.id || prevBook.chapters[0]?.id || null;
        if (chapterId && !selectedChapterId) {
          setSelectedChapterId(chapterId);
        }
        return prevBook;
      });
    }
  }, [selectedChapterId]);

  const handleSelectChapter = useCallback((chapterId: string) => {
    setSelectedChapterId(chapterId);
    setCurrentStage('body');
  }, []);

  const handleBackToChapters = useCallback(() => {
    setCurrentStage('chapters');
  }, []);

  // 将卷管理中的结构同步到章节管理
  const handleSyncVolumesToChapters = useCallback(async () => {
    if (!book) return;
    const now = Date.now();
    // 保留已有 content 的章节内容
    const existingMap = new Map(book.chapters.map((c) => [c.title + c.volumeId, c]));
    const newChapters: IChapter[] = [];

    book.volumes.forEach((vol) => {
      const volChapters = book.chapters.filter((c) => c.volumeId === vol.id);
      volChapters.forEach((ch) => {
        newChapters.push(ch);
      });
    });

    // 不在任何卷里的章节保留
    const orphanChapters = book.chapters.filter((c) => !c.volumeId);
    const allChapters = [...newChapters, ...orphanChapters];

    const updated = {
      ...book,
      chapters: allChapters,
      updatedAt: now,
    };
    const saved = await saveBook(updated);
    if (saved) {
      setBook(saved);
    } else {
      setBook(updated);
    }
    toast.success('已同步卷结构到章节管理');
  }, [book]);

  if (loading || !book) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">加载中...</div>
      </div>
    );
  }

  const completed = computeCompletedStages(book);
  const mobileNavItems = STAGES.slice(0, 5);

  const phases = [
    { key: 'ideation' as const, label: '立意' },
    { key: 'structure' as const, label: '结构' },
    { key: 'writing' as const, label: '成文' },
  ];

  const renderStage = () => {
    switch (currentStage) {
      case 'overview':
        return <OverviewStage book={book} onStart={() => handleStageChange('style')} />;
      case 'style':
        return <StyleStage book={book} onBookUpdate={handleBookUpdate} />;
      case 'synopsis':
        return <SynopsisStage book={book} onBookUpdate={handleBookUpdate} />;
      case 'titles':
        return <TitlesStage book={book} onBookUpdate={handleBookUpdate} />;
      case 'blurb':
        return <BlurbStage book={book} onBookUpdate={handleBookUpdate} />;
      case 'outline':
        return <OutlineStage book={book} onBookUpdate={handleBookUpdate} />;
      case 'characters':
        return <CharactersStage book={book} onBookUpdate={handleBookUpdate} />;
      case 'volumes':
        return <VolumesStage book={book} onBookUpdate={handleBookUpdate} />;
      case 'chapters':
        return (
          <ChaptersStage book={book} onSelectChapter={handleSelectChapter} onBookUpdate={handleBookUpdate} />
        );
      case 'body':
        return (
          <BodyStage
            book={book}
            chapterId={selectedChapterId}
            onBookUpdate={handleBookUpdate}
            onBackToList={handleBackToChapters}
            onSelectChapter={handleSelectChapter}
          />
        );
      case 'script':
        return <ScriptStage book={book} onBookUpdate={handleBookUpdate} />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-emerald-50/30">
      <SidebarProvider defaultOpen={true}>
        <WorkbenchSidebar
          book={book}
          currentStage={currentStage}
          onStageChange={handleStageChange}
        />
          <SidebarInset className="flex flex-col min-w-0">
            <WorkbenchToolbar book={book} onBookUpdate={handleBookUpdate} />
            <main className="flex-1 w-full overflow-y-auto pb-20 md:pb-0">
              <div className="flex gap-4 p-4 md:p-6 h-full">
                {/* 中间主编辑区 */}
                <div className="flex-1 min-w-0 py-2">{renderStage()}</div>

                {/* 右侧工作模式面板 */}
                <aside className="hidden lg:block w-72 xl:w-80 shrink-0">
                  <div className="sticky top-20 h-[calc(100vh-6rem)] rounded-xl border border-border/60 bg-card/70 backdrop-blur-sm p-3">
                    <WorkModePanel
                      book={book}
                      currentStage={currentStage}
                      onStageChange={handleStageChange}
                      selectedChapterId={selectedChapterId}
                      onBookUpdate={handleBookUpdate}
                      onSyncVolumesToChapters={handleSyncVolumesToChapters}
                    />
                  </div>
                </aside>
              </div>
            </main>

            {/* 窄视口底部阶段导航栏 */}
            <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-border/60 bg-background/95 backdrop-blur-md">
              <div className="flex items-center justify-around h-14 px-1">
                <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
                  <SheetTrigger asChild>
                    <Button variant="ghost" size="sm" className="flex flex-col items-center gap-0.5 h-12 w-14 p-0">
                      <Menu className="size-5" />
                      <span className="text-[10px]">全部</span>
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="left" className="w-72 p-0 bg-sidebar border-r border-primary/10">
                    <div className="h-full overflow-y-auto py-2">
                      {/* 抽屉顶部标题 */}
                      <div className="flex items-center gap-2 px-4 py-3 border-b border-sidebar-border mb-2">
                        <div className="size-8 shrink-0 rounded-md bg-gradient-to-br from-primary to-emerald-500 text-primary-foreground flex items-center justify-center">
                          <BookMarked className="size-4" />
                        </div>
                        <div className="text-sm font-semibold text-foreground">书案工作台</div>
                      </div>

                      {/* 返回藏书阁 / 回到首页 */}
                      <div className="px-2 pb-2 space-y-1">
                        <button
                          onClick={() => {
                            navigate('/library');
                            setMobileNavOpen(false);
                          }}
                          className="flex items-center gap-3 w-full px-3 py-2 rounded-md text-sm hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
                        >
                          <Library className="size-4 text-primary" />
                          <span>返回藏书阁</span>
                        </button>
                        <button
                          onClick={() => {
                            navigate('/');
                            setMobileNavOpen(false);
                          }}
                          className="flex items-center gap-3 w-full px-3 py-2 rounded-md text-sm hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
                        >
                          <Home className="size-4" />
                          <span>回到首页</span>
                        </button>
                      </div>

                      {/* 创作总览 */}
                      <div className="px-2 py-2">
                        <div className="px-2 pb-1 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          概览
                        </div>
                        <button
                          onClick={() => handleStageChange('overview')}
                          className={`flex items-center gap-3 w-full px-3 py-2 rounded-md text-sm transition-colors ${
                            currentStage === 'overview'
                              ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
                              : 'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                          }`}
                        >
                          <BarChart3 className="size-4" />
                          <span>创作总览</span>
                        </button>
                      </div>

                      {/* 三阶段 */}
                      {phases.map((phase) => {
                        const phaseStages = STAGES.filter((s) => s.phase === phase.key);
                        return (
                          <div key={phase.key} className="px-2 py-2">
                            <div className="px-2 pb-1 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                              {PHASE_LABELS[phase.key]}阶段
                            </div>
                            <div className="space-y-1">
                              {phaseStages.map((stage) => {
                                const Icon = stage.icon;
                                const done = completed.has(stage.key);
                                const active = currentStage === stage.key;
                                return (
                                  <button
                                    key={stage.key}
                                    onClick={() => handleStageChange(stage.key)}
                                    className={`flex items-center gap-3 w-full px-3 py-2 rounded-md text-sm transition-colors ${
                                      active
                                        ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
                                        : 'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                                    }`}
                                  >
                                    <div className="relative shrink-0">
                                      <Icon className="size-4" />
                                      {done && (
                                        <span className="absolute -top-1 -right-1 size-2 rounded-full bg-primary" />
                                      )}
                                    </div>
                                    <span className="flex-1 text-left">{stage.label}</span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </SheetContent>
                </Sheet>
                {mobileNavItems.map((stage) => {
                  const Icon = stage.icon;
                  const active = currentStage === stage.key;
                  const done = completed.has(stage.key);
                  return (
                    <button
                      key={stage.key}
                      onClick={() => handleStageChange(stage.key)}
                      className={`flex flex-col items-center justify-center gap-0.5 h-12 w-14 p-0 transition-colors ${
                        active
                          ? 'text-primary'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <div className="relative">
                        <Icon className="size-5" />
                        {done && (
                          <span className="absolute -top-1 -right-1 size-2 rounded-full bg-primary" />
                        )}
                      </div>
                      <span className="text-[10px] truncate max-w-full">{stage.label}</span>
                    </button>
                  );
                })}
              </div>
            </nav>
          </SidebarInset>
      </SidebarProvider>
    </div>
  );
}
