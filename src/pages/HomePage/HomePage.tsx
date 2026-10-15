import HeroSection from './HeroSection';
import FeaturesSection from './FeaturesSection';
import InspirationSection from './InspirationSection';
import CtaSection from './CtaSection';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      <main className="space-y-0">
        <HeroSection />
        <FeaturesSection />
        <InspirationSection />
        <CtaSection />
      </main>
    </div>
  );
}
