import { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { useMembership } from '@/lib/permissions';
import {
  BookOpen,
  Plus,
  Search,
  Trash2,
  Edit2,
  FileText,
  Clock,
  BookMarked,
  Upload,
  Lock,
  Crown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Image } from '@/components/ui/image';
import { format } from 'date-fns';
import type { IBookWork } from '@/data/novel';
import { getAllBooks, deleteBook, setCurrentBookId } from '@/lib/novel-generator';
import { useHasPermission } from '@/lib/permissions';
import NewBookDialog from '@/components/NewBookDialog';
import UploadContinueDialog from '@/components/UploadContinueDialog';

export default function LibraryPage() {
  const navigate = useNavigate();
  const canUploadContinue = useHasPermission('canUploadContinue');
  const { isMember, isPlus } = useMembership();
  const [books, setBooks] = useState<IBookWork[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [newBookOpen, setNewBookOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadPermTipOpen, setUploadPermTipOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<IBookWork | null>(null);

  const loadBooks = useCallback(async () => {
    setLoading(true);
    const result = await getAllBooks();
    setBooks(result);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadBooks();
  }, [loadBooks]);

  const filteredBooks = useMemo(() => {
    if (!searchQuery.trim()) return books;
    const q = searchQuery.toLowerCase();
    return books.filter(
      (b) =>
        b.title.toLowerCase().includes(q) ||
        b.author.toLowerCase().includes(q) ||
        b.genre.toLowerCase().includes(q)
    );
  }, [books, searchQuery]);

  const refreshBooks = () => { loadBooks(); };

  const handleOpenBook = (book: IBookWork) => {
    setCurrentBookId(book.id);
    navigate(`/workbench/${book.id}`);
  };

  const handleEditBook = (book: IBookWork) => {
    // 用新建对话框的编辑模式打开
    toast.info('编辑功能开发中');
  };

  const handleDeleteBook = async () => {
    if (!deleteTarget) return;
    await deleteBook(deleteTarget.id);
    setBooks((prev) => prev.filter((b) => b.id !== deleteTarget.id));
    toast.success(`已删除《${deleteTarget.title}》`);
    setDeleteTarget(null);
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-br from-background via-primary/5 to-background">
      <div className="max-w-6xl mx-auto px-4 md:px-6 py-8">
        {/* 页头 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6"
        >
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground flex items-center gap-2">
              <BookMarked className="size-7 text-primary" />
              藏书阁
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {books.length} 部在架作品 · 共计 {books.reduce((s, b) => s + b.chapterCount, 0)} 章
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative w-full md:w-64">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="检索书名、作者或分类"
                className="bg-background pl-9"
              />
            </div>
            <Button
              className="bg-gradient-to-r from-primary to-emerald-500 text-primary-foreground hover:from-primary/90 hover:to-emerald-500/90 shadow-md shadow-primary/20 whitespace-nowrap"
              onClick={() => setNewBookOpen(true)}
            >
              <Plus className="size-4 mr-1.5" />
              新建书籍
            </Button>
            <Button
              variant="outline"
              className="whitespace-nowrap border-primary/30 text-primary hover:bg-primary/10"
              onClick={() => {
                if (!canUploadContinue) {
                  setUploadPermTipOpen(true);
                  return;
                }
                setUploadOpen(true);
              }}
            >
              <Upload className="size-4 mr-1.5" />
              上传续写
            </Button>
          </div>
        </motion.div>

        {/* 书籍列表 */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="rounded-xl border border-border/40 bg-card/50 overflow-hidden animate-pulse"
              >
                <div className="flex gap-4 p-4">
                  <div className="size-20 md:size-24 rounded-lg bg-muted/60" />
                  <div className="flex-1 space-y-2 py-1">
                    <div className="h-5 bg-muted/60 rounded w-3/4" />
                    <div className="h-3 bg-muted/40 rounded w-1/2" />
                    <div className="h-3 bg-muted/40 rounded w-2/3 mt-4" />
                  </div>
                </div>
                <div className="border-t border-border/60 px-4 py-2 h-9" />
              </div>
            ))}
          </div>
        ) : filteredBooks.length === 0 ? (
          <Card className="border-primary/15 bg-card/60 backdrop-blur-sm">
            <CardContent className="flex flex-col items-center justify-center py-20 text-center">
              <div className="relative mb-6">
                <div className="absolute inset-0 bg-primary/15 blur-2xl rounded-full scale-150" />
                <div className="relative size-24 flex items-center justify-center">
                  <BookOpen className="size-14 text-primary/50" />
                </div>
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">
                架上暂无作品
              </h3>
              <p className="text-muted-foreground max-w-sm mb-6">
                {searchQuery.trim()
                  ? '没有找到匹配的作品，试试其他关键词。'
                  : '先创建第一部作品，开启你的创作之旅。'}
              </p>
              {!searchQuery.trim() && (
                <Button
                  className="bg-gradient-to-r from-primary to-emerald-500 text-primary-foreground hover:from-primary/90 hover:to-emerald-500/90 shadow-md shadow-primary/20"
                  onClick={() => setNewBookOpen(true)}
                >
                  <Plus className="size-4 mr-1.5" />
                  新建书籍
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredBooks.map((book, index) => (
              <motion.div
                key={book.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.04 }}
                whileHover={{ y: -4, transition: { duration: 0.2 } }}
                onClick={() => handleOpenBook(book)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleOpenBook(book);
                  }
                }}
                className="cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-xl"
              >
                  <Card className="h-full border-primary/10 bg-card/70 backdrop-blur-sm hover:border-primary/30 transition-all overflow-hidden group">
                    <div className="flex gap-4 p-4">
                      {/* 封面 */}
                      <div className="size-20 md:size-24 rounded-lg overflow-hidden bg-gradient-to-br from-primary/20 to-emerald-500/10 shrink-0 flex items-center justify-center border border-border/50">
                        {book.coverImage ? (
                          <Image
                            src={book.coverImage}
                            alt={book.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <FileText className="size-8 text-primary/50" />
                        )}
                      </div>
                      {/* 信息 */}
                      <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                        <div>
                          <h3 className="font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                            {book.title || '未命名作品'}
                          </h3>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {book.author} · {book.genre}
                          </p>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <FileText className="size-3" />
                            {book.chapterCount} 章
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="size-3" />
                            {format(book.updatedAt, 'MM-dd')}
                          </span>
                        </div>
                      </div>
                    </div>
                    {/* 底部操作栏 */}
                    <div className="border-t border-border/60 px-4 py-2 flex items-center justify-between bg-muted/30">
                      <Badge
                        variant="outline"
                        className="border-primary/20 text-primary/80 bg-primary/5 text-xs"
                      >
                        {book.category === 'male' ? '男频' : '女频'}
                      </Badge>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7 text-muted-foreground hover:text-primary"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditBook(book);
                          }}
                        >
                          <Edit2 className="size-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7 text-muted-foreground hover:text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteTarget(book);
                          }}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
      </div>

      {/* 新建书籍对话框 */}
      <NewBookDialog
        open={newBookOpen}
        onOpenChange={setNewBookOpen}
        onCreated={(book) => {
          refreshBooks();
          setNewBookOpen(false);
          setCurrentBookId(book.id);
          navigate(`/workbench/${book.id}`);
        }}
      />

      {/* 上传续写权限提示对话框 */}
      <Dialog open={uploadPermTipOpen} onOpenChange={setUploadPermTipOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="size-5 text-warning" />
              暂无上传续写权限
            </DialogTitle>
            <DialogDescription>
              {isMember && isPlus ? (
                <span>
                  上传续写为 <span className="font-semibold text-purple-500">Ultra 会员专享</span> 功能，
                  升级 Ultra 即可解锁全部创作能力。
                </span>
              ) : (
                <span>
                  上传续写为会员专属功能，升级会员可解锁上传续写、短篇创作等全部创作能力。
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setUploadPermTipOpen(false)}>
              我知道了
            </Button>
            <Button
              className={isMember && isPlus
                ? 'bg-gradient-to-r from-purple-500 to-fuchsia-500 text-white hover:from-purple-600 hover:to-fuchsia-600'
                : 'bg-gradient-to-r from-primary to-amber-500 text-primary-foreground hover:from-primary/90 hover:to-amber-500/90'
              }
              onClick={() => { setUploadPermTipOpen(false); navigate('/redemption'); }}
            >
              <Crown className="size-4 mr-1.5" />
              {isMember && isPlus ? '升级 Ultra' : '开通会员'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 上传续写对话框 */}
      <UploadContinueDialog
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        onCreated={() => {
          refreshBooks();
          setUploadOpen(false);
        }}
      />

      {/* 删除确认 */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除作品？</AlertDialogTitle>
            <AlertDialogDescription>
              删除后《{deleteTarget?.title}》的所有章节和内容将无法恢复，请谨慎操作。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDeleteBook}
            >
              确认删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
