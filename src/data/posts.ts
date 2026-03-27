import type { BlogPost } from "@/types/blog";

let posts: BlogPost[] = [];

try {
  posts = (await import("@/generated/posts.json")).default as BlogPost[];
} catch {
  // No generated content yet — empty state
}

export function getAllPosts(): BlogPost[] {
  return posts;
}

export function getPostBySlug(slug: string): BlogPost | undefined {
  return posts.find((p) => p.slug === slug);
}
