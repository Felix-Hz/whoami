import { useCallback, useRef, useState } from "preact/hooks";
import Router, { type RouterOnChangeArgs } from "preact-router";
import { authoringSlot } from "@/authoring-slot";
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
  const [url, setUrl] = useState("");
  // Read once at hydration; the same path the prerender rendered, so the header matches
  const [path, setPath] = useState(() => (typeof location === "undefined" ? "/" : location.pathname));

  const handleRouteChange = useCallback((e: RouterOnChangeArgs) => {
    // Only the dev toolbar needs the url; a state update in production would re-render the hydrated page
    if (authoringSlot.Toolbar) setUrl(e.url);
    // Same value on the first event, so Preact skips the re-render
    setPath(e.url.split(/[?#]/)[0] || "/");
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
    <Layout home={path === "/"}>
      <div ref={contentRef}>
        <Router onChange={handleRouteChange}>
          <HeroSection path="/" />
          <BlogListPage path="/blog" />
          <BlogPostPage path="/blog/:slug" />
        </Router>
      </div>
      {authoringSlot.Toolbar && <authoringSlot.Toolbar url={url} />}
    </Layout>
  );
}
