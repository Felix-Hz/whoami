import type { POSTS_QUERY_RESULT } from "@/generated/sanity.types";

type QueriedPost = POSTS_QUERY_RESULT[number];
type BodyBlock = NonNullable<QueriedPost["body"]>[number];

// Code blocks carry Shiki's pre-rendered markup, added by scripts/fetch-content.ts
export type PostBodyBlock = BodyBlock extends infer B
  ? B extends { _type: "code" }
    ? B & { html?: string }
    : B
  : never;

export type BlogPost = Omit<QueriedPost, "body" | "tags"> & {
  body: PostBodyBlock[];
  tags: string[];
  readingTime: number;
  // Dev-only draft preview; never present in production content
  previewStatus?: "draft" | "changed";
};
