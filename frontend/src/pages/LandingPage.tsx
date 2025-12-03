import { PageTransition } from '@/components/common/PageTransition';
import { Footer } from '@/components/layout/Footer';
import { LandingNavbar } from '@/features/landing/components/LandingNavbar';
import { HeroSection } from '@/features/landing/components/HeroSection';
import { FeaturesSection } from '@/features/landing/components/FeaturesSection';
import { HowItWorksSection } from '@/features/landing/components/HowItWorksSection';
import { TestimonialsSection } from '@/features/landing/components/TestimonialsSection';
import { FAQSection } from '@/features/landing/components/FAQSection';
import { CTASection } from '@/features/landing/components/CTASection';

export function LandingPage() {
  return (
    <PageTransition>
      <div className="min-h-screen flex flex-col">
        <LandingNavbar />
        <HeroSection />
        <FeaturesSection />
        <HowItWorksSection />
        <TestimonialsSection />
        <FAQSection />
        <CTASection />
        <Footer />
      </div>
    </PageTransition>
  );
}
