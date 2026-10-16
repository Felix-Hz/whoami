import { authoringSlot } from "@/authoring-slot";
import type { BlogPost } from "@/types/blog";

// ISO dates in a tabular mono line up down the index; they're also unambiguous everywhere
export function isoDate(iso: string): string {
  return iso.slice(0, 10);
}

export function BlogPostCard({ post, index, thumbs }: { post: BlogPost; index: number; thumbs: boolean }) {
  return (
    <li>
      <a
        href={`/blog/${post.slug}`}
        className="group grid grid-cols-[minmax(0,1fr)_auto] md:grid-cols-[8rem_minmax(0,1fr)_auto] gap-x-6 gap-y-1 py-5 md:py-6 border-b border-rule items-start"
      >
        <span className="meta col-span-2 md:col-span-1 flex items-center gap-2 md:pt-[0.45rem]">
          <time dateTime={post.publishedAt}>{isoDate(post.publishedAt)}</time>
          {authoringSlot.Badge && <authoringSlot.Badge post={post} />}
        </span>
        <span className="min-w-0">
          <span className="block text-item text-ink group-hover:text-accent">{post.title}</span>
          {post.excerpt && <span className="block text-small text-ink-2 mt-1">{post.excerpt}</span>}
          {post.tags.length > 0 && (
            <span className="block meta mt-2">
              <span className="sr-only">tags: </span>
              {post.tags.map((tag, i) => (
                <span key={tag} className="whitespace-nowrap">
                  {i > 0 && " · "}
                  {tag}
                </span>
              ))}
            </span>
          )}
        </span>
        <span className="flex flex-col items-end gap-2 pt-[0.45rem]">
          {thumbs && post.coverImage && (
            <span className="plate block w-20 md:w-28 aspect-[4/3]">
              <img
                src={`${post.coverImage}?w=224&h=168&fit=crop&auto=format`}
                srcSet={[112, 168, 224, 336]
                  .map((w) => `${post.coverImage}?w=${w}&h=${(w * 3) / 4}&fit=crop&auto=format ${w}w`)
                  .join(", ")}
                sizes="(min-width: 768px) 112px, 80px"
                alt=""
                width={112}
                height={84}
                // Only the first rows are on screen at load
                loading={index < 2 ? "eager" : "lazy"}
                decoding="async"
              />
            </span>
          )}
          <span className="meta whitespace-nowrap">{post.readingTime} min</span>
        </span>
      </a>
    </li>
  );
}
