import type { PortableTextBlock } from "@portabletext/react";

export interface BlogPost {
  title: string;
  slug: string;
  excerpt: string | null;
  body: PortableTextBlock[];
  tags: string[];
  publishedAt: string | null;
  coverImage: string | null;
  readingTime: number;
}
