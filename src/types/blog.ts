import type { PortableTextBlock } from "@portabletext/react";

export interface BlogPost {
  title: string;
  slug: string;
  excerpt: string;
  body: PortableTextBlock[];
  tags: string[];
  publishedAt: string;
  coverImage: string | null;
  readingTime: number;
}
