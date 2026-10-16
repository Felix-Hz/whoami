import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { h } from "preact";
import renderToString from "preact-render-to-string";
import { BlogListPage } from "../src/components/blog/BlogListPage";
import { BlogPostPage } from "../src/components/blog/BlogPostPage";
import { HeroSection } from "../src/components/home/HeroSection";
import { Layout } from "../src/components/layout/Layout";
import { getAllPosts } from "../src/data/posts";
import { flushHead, type HeadMeta } from "../src/head";
import { rss, sitemap } from "./feeds";
import { homeImage, postImage } from "./og";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const distDir = resolve(scriptDir, "../dist");
const template = readFileSync(resolve(distDir, "index.html"), "utf-8");

interface Route {
  path: string;
  element: ReturnType<typeof h>;
}

const defaultHead: HeadMeta = {
  title: "felix hernandez vieyra | whoami",
  description: "software engineer. building for humans. simple > complex.",
  url: "https://felix-hzv.dev",
  image: "https://felix-hzv.dev/og/home.png",
};

// Must mirror App's tree (Layout > div > page), or hydration throws the prerendered DOM away
function page(content: ReturnType<typeof h>, home = false) {
  return h(Layout, { home }, h("div", null, content));
}

const routes: Route[] = [
  { path: "/", element: page(h(HeroSection, null), true) },
  { path: "/blog", element: page(h(BlogListPage, null)) },
];

for (const post of getAllPosts()) {
  routes.push({
    path: `/blog/${post.slug}`,
    element: page(h(BlogPostPage, { slug: post.slug })),
  });
}

function escapeAttr(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
}

function injectMeta(html: string, meta: HeadMeta): string {
  let out = html;
  out = out.replace(/<title>.*?<\/title>/, `<title>${escapeAttr(meta.title)}</title>`);
  out = out.replace(/(<meta\s+name="description"\s+content=").*?(")/, `$1${escapeAttr(meta.description)}$2`);
  out = out.replace(/(<meta\s+property="og:title"\s+content=").*?(")/, `$1${escapeAttr(meta.title)}$2`);
  out = out.replace(/(<meta\s+property="og:description"\s+content=").*?(")/, `$1${escapeAttr(meta.description)}$2`);
  out = out.replace(/(<meta\s+property="og:url"\s+content=").*?(")/, `$1${escapeAttr(meta.url)}$2`);
  out = out.replace(/(<meta\s+name="twitter:title"\s+content=").*?(")/, `$1${escapeAttr(meta.title)}$2`);
  out = out.replace(/(<meta\s+name="twitter:description"\s+content=").*?(")/, `$1${escapeAttr(meta.description)}$2`);
  out = out.replace(/(<link\s+rel="canonical"\s+href=").*?(")/, `$1${escapeAttr(meta.url)}$2`);

  if (meta.image) {
    out = out.replace(/(<meta\s+name="twitter:card"\s+content=").*?(")/, "$1summary_large_image$2");
    out = out.replace(/(<meta\s+property="og:image"\s+content=").*?(")/, `$1${escapeAttr(meta.image)}$2`);
    out = out.replace(/(<meta\s+name="twitter:image"\s+content=").*?(")/, `$1${escapeAttr(meta.image)}$2`);
  }

  if (meta.type === "article") {
    out = out.replace(/(<meta\s+property="og:type"\s+content=")[^"]*(")/, "$1article$2");
    if (meta.publishedTime) {
      out = out.replace(
        /(<meta\s+property="og:type"\s+content="article"\s*\/>)/,
        `$1\n        <meta property="article:published_time" content="${escapeAttr(meta.publishedTime)}" />`,
      );
    }
  }

  return out;
}

// Which markup pulls in each font face (see index.css); a page only preloads the faces it renders
const FONT_USAGE: Record<string, (body: string) => boolean> = {
  newsreader: () => true,
  "newsreader-display": (body) => body.includes("<h1") || body.includes("<h2"),
  "departure-mono": (body) => body.includes("font-pixel"),
};

function pruneFontPreloads(html: string, body: string): string {
  return html.replace(
    /\s*<link rel="preload" href="\/assets\/([a-z-]+?)-[\w-]{8}\.woff2"[^>]*>/g,
    (tag, face: string) => (FONT_USAGE[face] && !FONT_USAGE[face](body) ? "" : tag),
  );
}

console.log(`Prerendering ${routes.length} routes...`);

for (const route of routes) {
  const body = renderToString(route.element);
  const head = flushHead() ?? defaultHead;

  let html = template;
  html = html.replace('<div id="app"></div>', `<div id="app">${body}</div>`);
  html = injectMeta(html, head);
  html = pruneFontPreloads(html, body);

  const filePath =
    route.path === "/" ? resolve(distDir, "index.html") : resolve(distDir, route.path.slice(1), "index.html");

  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(filePath, html);
  console.log(`  ${route.path} -> ${filePath.replace(distDir, "dist")}`);
}

// Feeds and share images, from the same posts the pages were built from
const posts = getAllPosts();
writeFileSync(resolve(distDir, "rss.xml"), rss(posts));
writeFileSync(resolve(distDir, "sitemap.xml"), sitemap(posts));
mkdirSync(resolve(distDir, "og"), { recursive: true });
writeFileSync(resolve(distDir, "og/home.png"), await homeImage());
for (const post of posts) writeFileSync(resolve(distDir, `og/${post.slug}.png`), await postImage(post));
console.log(`  rss.xml, sitemap.xml and ${posts.length + 1} OG images`);

console.log("Prerendering complete.");
