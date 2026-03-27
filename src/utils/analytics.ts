function gtag(...args: unknown[]) {
  if (window.gtag) {
    window.gtag(...args);
  }
}

export function trackPageView(path: string) {
  gtag("event", "page_view", { page_path: path });
}

export function trackSocialClick(platform: string) {
  gtag("event", "social_click", { platform, event_category: "engagement" });
}

export function trackBlogPostView(slug: string, title: string) {
  gtag("event", "blog_post_view", { slug, title, event_category: "blog" });
}

export function trackShareClick(platform: string, slug: string) {
  gtag("event", "share_click", { platform, slug, event_category: "blog" });
}
