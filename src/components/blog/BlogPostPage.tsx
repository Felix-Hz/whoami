import { PortableText } from "@portabletext/react";
import type { RoutableProps } from "preact-router";
import { getPostBySlug } from "@/data/posts";
import { useHead } from "@/hooks/useHead";
import { trackBlogPostView } from "@/utils/analytics";
import { portableTextComponents } from "./PortableTextComponents";
import { ShareLinks } from "./ShareLinks";

interface BlogPostPageProps extends RoutableProps {
  slug?: string;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

export function BlogPostPage({ slug }: BlogPostPageProps) {
  const post = slug ? getPostBySlug(slug) : undefined;

  useHead({
    title: post ? `${post.title} | felix hernandez vieyra` : "post not found",
    description: post?.excerpt || "blog post",
    url: `https://felix-hzv.dev/blog/${slug || ""}`,
    image: post?.coverImage || undefined,
  });

  if (!post) {
    return (
      <section className="flex-1 px-6 md:px-8 lg:px-16 pt-20 md:pt-24 lg:pt-32 pb-8 md:pb-12 lg:pb-20">
        <div className="w-full max-w-3xl mx-auto animate-fade-up">
          <a
            href="/blog"
            className="group inline-flex items-baseline font-[var(--font-mono)] text-sm text-text-secondary mb-8 transition-colors duration-normal"
          >
            <span className="text-accent font-bold">$</span>
            <span className="ml-1.5 group-hover:text-accent transition-colors duration-normal">cd ../blog</span>
            <span className="inline-block ml-2 transition-transform duration-normal group-hover:-translate-x-1 text-accent">
              &larr;
            </span>
          </a>
          <h1 className="text-3xl text-text-primary">post not found</h1>
          <p className="mt-3 text-text-secondary">the post you're looking for doesn't exist.</p>
        </div>
      </section>
    );
  }

  const postUrl = `https://felix-hzv.dev/blog/${post.slug}`;
  trackBlogPostView(post.slug, post.title);

  return (
    <section className="flex-1 px-6 md:px-8 lg:px-16 pt-20 md:pt-24 lg:pt-32 pb-8 md:pb-12 lg:pb-20">
      <article className="w-full max-w-3xl mx-auto">
        <a
          href="/blog"
          className="group inline-flex items-baseline font-[var(--font-mono)] text-sm text-text-secondary mb-8 animate-fade-up transition-colors duration-normal"
        >
          <span className="text-accent font-bold">$</span>
          <span className="ml-1.5 group-hover:text-accent transition-colors duration-normal">cd ../blog</span>
          <span className="inline-block ml-2 transition-transform duration-normal group-hover:-translate-x-1 text-accent">
            &larr;
          </span>
        </a>

        <header className="mb-10 animate-fade-up" style={{ animationDelay: "100ms" }}>
          <div className="flex items-center gap-3 text-xs text-text-tertiary tracking-wide mb-3">
            <time dateTime={post.publishedAt}>{formatDate(post.publishedAt)}</time>
            <span aria-hidden="true">/</span>
            <span>{post.readingTime} min read</span>
          </div>

          <h1 className="text-3xl md:text-4xl lg:text-5xl text-text-primary tracking-[-0.04em] leading-[0.95]">
            {post.title}
          </h1>

          {post.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-4">
              {post.tags.map((tag) => (
                <span
                  key={tag}
                  className="text-xs text-text-tertiary bg-accent-subtle px-2 py-0.5 rounded-sm tracking-wide"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </header>

        {post.coverImage && (
          <div className="mb-10 animate-fade-up" style={{ animationDelay: "150ms" }}>
            <img
              src={`${post.coverImage}?w=960&fit=max&auto=format`}
              alt=""
              className="w-full rounded-sm"
              loading="eager"
            />
          </div>
        )}

        <div className="text-base md:text-lg animate-fade-up" style={{ animationDelay: "200ms" }}>
          <PortableText value={post.body} components={portableTextComponents} />
        </div>

        <ShareLinks title={post.title} slug={post.slug} url={postUrl} />
      </article>
    </section>
  );
}
