import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { createClient } from "@sanity/client";
import { createHighlighter } from "shiki";
import type { POSTS_QUERY_RESULT } from "../src/generated/sanity.types";
import { POSTS_QUERY, PREVIEW_POSTS_QUERY, PUBLISHED_POST_IDS_QUERY } from "../src/queries";

export interface FetchOptions {
  projectId: string;
  dataset?: string;
  // Read-only Viewer token. Only the dev server passes it; production builds never do.
  previewToken?: string;
}

type Post = POSTS_QUERY_RESULT[number] & { previewStatus?: "draft" | "changed" };

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

// Created once; the dev server refreshes content many times per session
let highlighter: Promise<Highlighter> | undefined;

// Pre-renders code blocks to highlighted HTML so the site ships no highlighter to the browser
function highlightCode(blocks: unknown[], hl: Highlighter): unknown[] {
  return blocks.map((block) => {
    if (typeof block !== "object" || block === null) return block;
    const { _type, code, language } = block as { _type?: string; code?: string; language?: string };
    if (_type !== "code" || !code) return block;

    const lang = language && LANGS.includes(language) ? language : "text";
    const html = hl.codeToHtml(code, { lang, themes: THEMES, defaultColor: false });
    // Keep only the inner <code> markup; the site renders its own <pre> wrapper
    const inner = html.match(/<code[^>]*>([\s\S]*)<\/code><\/pre>$/)?.[1];
    return inner ? { ...block, html: inner } : block;
  });
}

async function fetchPreview(client: ReturnType<typeof createClient>): Promise<Post[]> {
  const [posts, publishedIds] = await Promise.all([
    client.fetch(PREVIEW_POSTS_QUERY, {}, { perspective: "drafts" }),
    client.fetch(PUBLISHED_POST_IDS_QUERY, {}, { perspective: "raw" }),
  ]);
  const published = new Set(publishedIds);

  return posts.map(({ _originalId, ...post }) => {
    // Typegen can't see perspective-only fields, so it types _originalId as null
    const originalId = _originalId as unknown as string | undefined;
    const isDraft = originalId?.startsWith("drafts.") ?? false;
    if (!isDraft) return post;
    return { ...post, previewStatus: published.has(post._id) ? "changed" : "draft" };
  });
}

export async function fetchPosts({ projectId, dataset = "production", previewToken }: FetchOptions) {
  const client = createClient({
    projectId,
    dataset,
    token: previewToken,
    // Build-time fetch runs right after a publish webhook; the CDN can still serve the old version
    useCdn: false,
    apiVersion: "2025-02-06",
  });

  const posts: Post[] = previewToken ? await fetchPreview(client) : await client.fetch(POSTS_QUERY);
  highlighter ??= createHighlighter({ themes: Object.values(THEMES), langs: LANGS });
  const hl = await highlighter;

  return posts.map((post) => ({
    ...post,
    body: highlightCode(post.body ?? [], hl),
    tags: post.tags ?? [],
    coverImageCredit: post.coverImageCredit ?? null,
    readingTime: Math.max(1, Math.round(countWords(post.body ?? []) / 200)),
  }));
}

export const POSTS_PATH = resolve(dirname(fileURLToPath(import.meta.url)), "../src/generated/posts.json");

export function writePosts(posts: unknown[]): void {
  mkdirSync(dirname(POSTS_PATH), { recursive: true });
  writeFileSync(POSTS_PATH, JSON.stringify(posts, null, 2));
}

async function main() {
  const projectId = process.env.SANITY_PROJECT_ID;
  if (!projectId) {
    console.warn("Missing SANITY_PROJECT_ID env var — skipping content fetch.");
    return;
  }

  // Drafts only with an explicit --preview (dev:fetch) and never in CI
  const preview = process.argv.includes("--preview") && !process.env.CI;
  const previewToken = preview ? process.env.SANITY_PREVIEW_TOKEN || undefined : undefined;

  console.log(`Fetching blog posts from Sanity${previewToken ? " (drafts preview)" : ""}...`);
  const posts = await fetchPosts({ projectId, dataset: process.env.SANITY_DATASET, previewToken });
  writePosts(posts);
  console.log(`Fetched ${posts.length} posts → ${POSTS_PATH}`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error("Failed to fetch content:", err);
    process.exit(1);
  });
}
