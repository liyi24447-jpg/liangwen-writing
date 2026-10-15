import { Outlet } from 'react-router-dom';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Toaster } from '@/components/ui/sonner';
import AnnouncementModal from '@/components/AnnouncementModal';

export function Layout() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
        <main className="flex-1 w-full">
          <Outlet />
        </main>
        <Footer />
        <Toaster />
        <AnnouncementModal />
      </div>
  );
}
