import type { BlogPost } from "@/types/blog";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

export function BlogPostCard({ post, index }: { post: BlogPost; index: number }) {
  return (
    <a
      href={`/blog/${post.slug}`}
      className="group block py-6 border-b border-border last:border-b-0 animate-fade-up transition-transform duration-normal group-hover:translate-x-0.5"
      style={{ animationDelay: `${(index + 1) * 100}ms` }}
    >
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3 text-xs text-text-tertiary tracking-wide">
          <time dateTime={post.publishedAt}>{formatDate(post.publishedAt)}</time>
          <span aria-hidden="true">/</span>
          <span>{post.readingTime} min read</span>
        </div>

        <h2 className="font-[var(--font-heading)] text-xl md:text-2xl text-text-primary group-hover:text-accent transition-colors duration-normal inline-flex items-baseline gap-2">
          {post.title}
          <span className="text-accent text-sm opacity-0 -translate-x-2 transition-all duration-normal group-hover:opacity-100 group-hover:translate-x-0">
            &rarr;
          </span>
        </h2>

        {post.excerpt && (
          <p className="text-text-secondary text-sm md:text-base leading-relaxed max-w-2xl">{post.excerpt}</p>
        )}

        {post.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {post.tags.map((tag) => (
              <span
                key={tag}
                className="text-[10px] text-accent border border-accent/20 bg-accent-subtle px-2 py-0.5 rounded-sm tracking-wide"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </a>
  );
}
