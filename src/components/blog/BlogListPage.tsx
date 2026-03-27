import type { RoutableProps } from "preact-router";
import { getAllPosts } from "@/data/posts";
import { useHead } from "@/hooks/useHead";
import { BlogPostCard } from "./BlogPostCard";

export function BlogListPage(_props: RoutableProps) {
  const posts = getAllPosts();

  useHead({
    title: "blog | felix hernandez vieyra",
    description: "thoughts on software engineering, web development, and technology.",
    url: "https://felix-hzv.dev/blog",
  });

  return (
    <section className="flex-1 px-6 md:px-8 lg:px-16 pt-20 md:pt-24 lg:pt-32 pb-8 md:pb-12 lg:pb-20">
      <div className="w-full max-w-3xl mx-auto">
        <header className="mb-12 animate-fade-up">
          <h1 className="text-4xl md:text-5xl lg:text-6xl text-text-primary tracking-[-0.04em] leading-[0.9]">blog</h1>
          <p className="mt-3 text-text-tertiary text-sm tracking-wide uppercase">
            writing about software, architecture &amp; the things I learn
          </p>
        </header>

        {posts.length === 0 ? (
          <div
            className="font-[var(--font-mono)] text-sm animate-fade-up flex flex-col gap-1"
            style={{ animationDelay: "100ms" }}
          >
            <span>
              <span className="text-accent font-bold">$</span>
              <span className="text-text-secondary ml-1.5">ls ./posts</span>
            </span>
            <span className="text-text-tertiary">(empty)</span>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {posts.map((post, i) => (
              <BlogPostCard key={post.slug} post={post} index={i} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
