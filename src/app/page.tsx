import { Aurora } from "@/components/aurora";
import { MarketingNav } from "@/components/marketing/marketing-nav";
import { Hero } from "@/components/marketing/hero";
import { Marquee } from "@/components/marketing/marquee";
import { Features } from "@/components/marketing/features";
import { Testimonials } from "@/components/marketing/testimonials";
import { CtaBand } from "@/components/marketing/cta";
import { Footer } from "@/components/marketing/footer";

export default function HomePage() {
  return (
    <>
      <Aurora />
      <MarketingNav />
      <main id="features">
        <Hero />
        <Marquee />
        <Features />
        <Testimonials />
        <CtaBand />
      </main>
      <Footer />
    </>
  );
}
