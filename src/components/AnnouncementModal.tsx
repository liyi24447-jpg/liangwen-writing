import { useState, useEffect } from 'react';
import { X, Megaphone } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth-context';
import { apiGetCurrentAnnouncement, type Announcement } from '@/lib/api-client';
import { scopedStorage } from '@lark-apaas/client-toolkit-lite';

const ANNOUNCEMENT_DISMISSED_KEY = 'liangwen_announcement_dismissed_id';

export default function AnnouncementModal() {
  const { isLoggedIn, isLoading } = useAuth();
  const [open, setOpen] = useState(false);
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);

  useEffect(() => {
    if (!isLoggedIn || isLoading) return;

    let cancelled = false;
    apiGetCurrentAnnouncement()
      .then((res) => {
        if (cancelled) return;
        if (res.success && res.data) {
          setAnnouncement(res.data);
          // 检查是否已关闭过同一公告
          const dismissedId = scopedStorage.getItem(ANNOUNCEMENT_DISMISSED_KEY);
          if (dismissedId !== String(res.data.id)) {
            setOpen(true);
          }
        }
      })
      .catch(() => {
        // 静默失败
      });

    return () => {
      cancelled = true;
    };
  }, [isLoggedIn, isLoading]);

  const handleClose = () => {
    if (announcement) {
      scopedStorage.setItem(ANNOUNCEMENT_DISMISSED_KEY, String(announcement.id));
    }
    setOpen(false);
  };

  if (!announcement) return null;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="sm:max-w-lg border-border/60 bg-card/95 backdrop-blur-md p-0 overflow-hidden">
        <div className="bg-gradient-to-r from-primary/15 via-amber-400/10 to-primary/15 px-6 py-5 border-b border-border/50">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-foreground">
              <div className="size-9 rounded-full bg-primary/20 flex items-center justify-center">
                <Megaphone className="size-5 text-primary" />
              </div>
              <span className="text-lg">{announcement.title || '公告'}</span>
            </DialogTitle>
          </DialogHeader>
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-4 top-4 text-muted-foreground hover:text-foreground"
            onClick={handleClose}
          >
            <X className="size-4" />
          </Button>
        </div>

        <div className="px-6 py-5 max-h-[60vh] overflow-y-auto">
          <div className="prose prose-sm max-w-none text-foreground leading-relaxed whitespace-pre-wrap">
            {announcement.content || '暂无内容'}
          </div>
        </div>

        <div className="px-6 py-4 border-t border-border/50 bg-muted/30 flex justify-end">
          <Button
            className="bg-gradient-to-r from-primary to-amber-500 text-primary-foreground hover:from-primary/90 hover:to-amber-500/90"
            onClick={handleClose}
          >
            我知道了
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
