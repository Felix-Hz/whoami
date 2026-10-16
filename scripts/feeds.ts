import { PortableText } from "@portabletext/react";
import { h } from "preact";
import renderToString from "preact-render-to-string";
import { createPortableTextComponents } from "../src/components/blog/PortableTextComponents";
import type { BlogPost } from "../src/types/blog";

// RSS and sitemap, built from posts.json. Dates come from publishedAt only, never Sanity's _updatedAt,
// so editing a post never makes it look new.

export const SITE = "https://felix-hzv.dev";
const TITLE = "felix hernandez vieyra";
const DESCRIPTION = "thoughts on software engineering, web development, and technology.";

const escapeXml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");

// CDATA can't contain its own terminator; split it across two sections
const cdata = (s: string) => `<![CDATA[${s.replace(/]]>/g, "]]]]><![CDATA[>")}]]>`;

const rfc822 = (iso: string) => new Date(iso).toUTCString();

// Feed readers ignore the site's CSS, so relative links and images need the full origin
const absolutize = (html: string) => html.replace(/(href|src)="\//g, `$1="${SITE}/`);

function postHtml(post: BlogPost): string {
  const components = createPortableTextComponents(post.body);
  return absolutize(renderToString(h(PortableText, { value: post.body, components })));
}

export function rss(posts: BlogPost[]): string {
  const latest = posts[0]?.publishedAt;
  const items = posts
    .map((post) => {
      const url = `${SITE}/blog/${post.slug}`;
      const categories = post.tags.map((tag) => `      <category>${escapeXml(tag)}</category>`).join("\n");
      return [
        "    <item>",
        `      <title>${escapeXml(post.title)}</title>`,
        `      <link>${url}</link>`,
        `      <guid isPermaLink="true">${url}</guid>`,
        `      <pubDate>${rfc822(post.publishedAt)}</pubDate>`,
        `      <description>${escapeXml(post.excerpt ?? "")}</description>`,
        `      <content:encoded>${cdata(postHtml(post))}</content:encoded>`,
        categories,
        "    </item>",
      ]
        .filter(Boolean)
        .join("\n");
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>${escapeXml(TITLE)}</title>
    <link>${SITE}/blog</link>
    <description>${escapeXml(DESCRIPTION)}</description>
    <language>en</language>
    <atom:link href="${SITE}/rss.xml" rel="self" type="application/rss+xml" />${latest ? `\n    <lastBuildDate>${rfc822(latest)}</lastBuildDate>` : ""}
${items}
  </channel>
</rss>
`;
}

export function sitemap(posts: BlogPost[]): string {
  const latest = posts[0]?.publishedAt.slice(0, 10);
  const urls = [
    { loc: `${SITE}/`, lastmod: latest },
    { loc: `${SITE}/blog`, lastmod: latest },
    ...posts.map((post) => ({ loc: `${SITE}/blog/${post.slug}`, lastmod: post.publishedAt.slice(0, 10) })),
  ];
  const entries = urls
    .map(
      ({ loc, lastmod }) =>
        `  <url>\n    <loc>${loc}</loc>${lastmod ? `\n    <lastmod>${lastmod}</lastmod>` : ""}\n  </url>`,
    )
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries}
</urlset>
`;
}
