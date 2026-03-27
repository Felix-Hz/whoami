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
import { flushHead } from "../src/head";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const distDir = resolve(scriptDir, "../dist");
const template = readFileSync(resolve(distDir, "index.html"), "utf-8");

interface Route {
  path: string;
  element: ReturnType<typeof h>;
}

const defaultHead = {
  title: "felix hernandez vieyra | whoami",
  description: "software engineer. building for humans. simple > complex.",
  url: "https://felix-hzv.dev",
};

const routes: Route[] = [
  { path: "/", element: h(Layout, null, h(HeroSection, null)) },
  { path: "/blog", element: h(Layout, null, h(BlogListPage, null)) },
];

for (const post of getAllPosts()) {
  routes.push({
    path: `/blog/${post.slug}`,
    element: h(Layout, null, h(BlogPostPage, { slug: post.slug })),
  });
}

function escapeAttr(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
}

function injectMeta(html: string, meta: { title: string; description: string; url: string; image?: string }): string {
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
    out = out.replace(
      "</head>",
      `<meta property="og:image" content="${escapeAttr(meta.image)}" />\n<meta name="twitter:image" content="${escapeAttr(meta.image)}" />\n</head>`,
    );
  }

  return out;
}

console.log(`Prerendering ${routes.length} routes...`);

for (const route of routes) {
  const body = renderToString(route.element);
  const head = flushHead() ?? defaultHead;

  let html = template;
  html = html.replace('<div id="app"></div>', `<div id="app">${body}</div>`);
  html = injectMeta(html, head);

  const filePath =
    route.path === "/" ? resolve(distDir, "index.html") : resolve(distDir, route.path.slice(1), "index.html");

  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(filePath, html);
  console.log(`  ${route.path} -> ${filePath.replace(distDir, "dist")}`);
}

console.log("Prerendering complete.");
