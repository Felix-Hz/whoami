import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@sanity/client";
import { createHighlighter } from "shiki";
import { POSTS_QUERY } from "../src/queries";

const projectId = process.env.SANITY_PROJECT_ID;
const dataset = process.env.SANITY_DATASET || "production";
const token = process.env.SANITY_API_TOKEN;

if (!projectId) {
  console.warn("Missing SANITY_PROJECT_ID env var — skipping content fetch.");
  process.exit(0);
}

const client = createClient({
  projectId,
  dataset,
  token,
  // Build-time fetch runs right after a publish webhook; the CDN can still serve the old version
  useCdn: false,
  apiVersion: "2025-02-06",
});

function countWords(blocks: unknown[]): number {
  let count = 0;
  for (const block of blocks) {
    if (typeof block === "object" && block !== null && "children" in block) {
      const children = (block as { children: { text?: string }[] }).children;
      for (const child of children) {
        if (child.text) {
          count += child.text.split(/\s+/).filter(Boolean).length;
        }
      }
    }
  }
  return count;
}

// Matches the language options of the Code Block in the CMS schema
const LANGS = ["typescript", "javascript", "html", "css", "python", "bash", "json", "yaml", "go", "rust"];

// Code blocks sit on an inverse surface, so the light site needs a dark theme and vice versa
const THEMES = { ondark: "vitesse-dark", onlight: "vitesse-light" };

type Highlighter = Awaited<ReturnType<typeof createHighlighter>>;

// Pre-renders code blocks to highlighted HTML so the site ships no highlighter to the browser
function highlightCode(blocks: unknown[], highlighter: Highlighter): unknown[] {
  return blocks.map((block) => {
    if (typeof block !== "object" || block === null) return block;
    const { _type, code, language } = block as { _type?: string; code?: string; language?: string };
    if (_type !== "code" || !code) return block;

    const lang = language && LANGS.includes(language) ? language : "text";
    const html = highlighter.codeToHtml(code, { lang, themes: THEMES, defaultColor: false });
    // Keep only the inner <code> markup; the site renders its own <pre> wrapper
    const inner = html.match(/<code[^>]*>([\s\S]*)<\/code><\/pre>$/)?.[1];
    return inner ? { ...block, html: inner } : block;
  });
}

async function main() {
  console.log("Fetching blog posts from Sanity...");

  const posts = await client.fetch(POSTS_QUERY);
  const highlighter = await createHighlighter({ themes: Object.values(THEMES), langs: LANGS });

  const enriched = posts.map((post) => ({
    ...post,
    body: highlightCode(post.body ?? [], highlighter),
    tags: post.tags ?? [],
    coverImageCredit: post.coverImageCredit ?? null,
    readingTime: Math.max(1, Math.round(countWords(post.body ?? []) / 200)),
  }));

  const scriptDir = dirname(fileURLToPath(import.meta.url));
  const outPath = resolve(scriptDir, "../src/generated/posts.json");
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, JSON.stringify(enriched, null, 2));

  console.log(`Fetched ${enriched.length} posts → ${outPath}`);
}

main().catch((err) => {
  console.error("Failed to fetch content:", err);
  process.exit(1);
});
