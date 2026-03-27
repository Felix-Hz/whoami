import { useCallback, useRef } from "preact/hooks";
import Router, { type RouterOnChangeArgs } from "preact-router";
import { BlogListPage } from "@/components/blog/BlogListPage";
import { BlogPostPage } from "@/components/blog/BlogPostPage";
import { HeroSection } from "@/components/home/HeroSection";
import { Layout } from "@/components/layout/Layout";
import { trackPageView } from "@/utils/analytics";

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

export function App() {
  const contentRef = useRef<HTMLDivElement>(null);
  const isFirstRender = useRef(true);

  const handleRouteChange = useCallback((e: RouterOnChangeArgs) => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    window.scrollTo(0, 0);
    trackPageView(e.url);
    const el = contentRef.current;
    if (el) {
      el.classList.remove("route-enter");
      void el.offsetWidth;
      el.classList.add("route-enter");
    }
  }, []);

  return (
    <Layout>
      <div ref={contentRef}>
        <Router onChange={handleRouteChange}>
          <HeroSection path="/" />
          <BlogListPage path="/blog" />
          <BlogPostPage path="/blog/:slug" />
        </Router>
      </div>
    </Layout>
  );
}
