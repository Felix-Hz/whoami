import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@sanity/client";

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
  useCdn: true,
  apiVersion: "2025-02-06",
});

interface SanityPost {
  title: string;
  slug: string;
  excerpt: string;
  body: unknown[];
  tags: string[] | null;
  publishedAt: string;
  coverImage: string | null;
}

const QUERY = `*[_type == "post" && !(_id in path("drafts.**")) && defined(slug.current) && defined(publishedAt) && defined(excerpt)] | order(publishedAt desc) {
  title,
  "slug": slug.current,
  excerpt,
  body,
  tags,
  publishedAt,
  "coverImage": mainImage.asset->url
}`;

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

async function main() {
  console.log("Fetching blog posts from Sanity...");

  const posts: SanityPost[] = await client.fetch(QUERY);

  const enriched = posts.map((post) => ({
    ...post,
    tags: post.tags ?? [],
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
