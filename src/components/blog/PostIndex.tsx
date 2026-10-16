import type { BlogPost } from "@/types/blog";
import { BlogPostCard } from "./BlogPostCard";

export { isoDate } from "./BlogPostCard";

export function PostIndex({ posts, thumbs = true }: { posts: BlogPost[]; thumbs?: boolean }) {
  return (
    <ol className="border-t border-ink">
      {posts.map((post, i) => (
        <BlogPostCard key={post.slug} post={post} index={i} thumbs={thumbs} />
      ))}
    </ol>
  );
}
