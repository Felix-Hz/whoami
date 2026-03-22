import { HeroSection } from "@/components/home/HeroSection";
import { Layout } from "@/components/layout/Layout";

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

export function App() {
  return (
    <Layout>
      <HeroSection />
    </Layout>
  );
}
