import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  BookMarked,
  Edit3,
  Check,
  X,
  Library,
  Sparkles,
  PanelLeft,
} from 'lucide-react';
import { useSidebar } from '@/components/ui/sidebar';
import { toast } from 'sonner';
import type { IBookWork } from '@/data/novel';
import { saveBook } from '@/lib/novel-generator';

interface WorkbenchToolbarProps {
  book: IBookWork;
  onBookUpdate: (book: IBookWork) => void;
}

export default function WorkbenchToolbar({ book, onBookUpdate }: WorkbenchToolbarProps) {
  const navigate = useNavigate();
  const { toggleSidebar } = useSidebar();
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(book.title);

  const categoryLabel = book.category === 'male' ? '男频' : '女频';

  const handleSaveTitle = async () => {
    if (!editTitle.trim()) {
      toast.warning('书名不能为空');
      return;
    }
    const updated = { ...book, title: editTitle.trim() };
    const saved = await saveBook(updated);
    if (saved) {
      onBookUpdate(saved);
    } else {
      onBookUpdate(updated);
    }
    setIsEditing(false);
    toast.success('书名已更新');
  };

  const handleCancelEdit = () => {
    setEditTitle(book.title);
    setIsEditing(false);
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-background/80 backdrop-blur-md border-b border-border/40">
      <div className="flex items-center h-14 px-3 md:px-4 gap-3">
        {/* 左侧：菜单按钮 + 书名 */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Button variant="ghost" size="icon" className="shrink-0" onClick={toggleSidebar}>
            <PanelLeft className="size-4" />
          </Button>

          <div className="flex items-center gap-2 min-w-0">
            <BookMarked className="size-5 text-primary shrink-0" />
            {isEditing ? (
              <div className="flex items-center gap-1">
                <Input
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="h-8 w-40 text-sm font-medium"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveTitle();
                    if (e.key === 'Escape') handleCancelEdit();
                  }}
                />
                <Button variant="ghost" size="icon" className="size-8" onClick={handleSaveTitle}>
                  <Check className="size-4 text-primary" />
                </Button>
                <Button variant="ghost" size="icon" className="size-8" onClick={handleCancelEdit}>
                  <X className="size-4 text-muted-foreground" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2 min-w-0 group">
                <span className="font-semibold text-foreground truncate">{book.title}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-6 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => setIsEditing(true)}
                >
                  <Edit3 className="size-3.5 text-muted-foreground" />
                </Button>
              </div>
            )}
            <Badge variant="outline" className="border-primary/30 text-primary text-xs shrink-0">
              {categoryLabel} · {book.genre}
            </Badge>
          </div>
        </div>

        {/* 右侧：字数 + 返回 */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="hidden sm:flex items-center gap-2 text-sm">
            <Sparkles className="size-4 text-primary" />
            <span className="text-muted-foreground">
              总字数 <span className="font-semibold text-foreground tabular-nums">{book.wordCount.toLocaleString()}</span>
            </span>
          </div>
          <Button variant="outline" size="sm" onClick={() => navigate('/library')}>
            <Library className="size-4 mr-1.5" />
            藏书阁
          </Button>
        </div>
      </div>
    </header>
  );
}
