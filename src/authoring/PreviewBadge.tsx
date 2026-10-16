import type { BlogPost } from "@/types/blog";

const LABELS = { draft: "DRAFT", changed: "unpublished changes" } as const;

export function PreviewBadge({ post }: { post: BlogPost }) {
  if (!post.previewStatus) return null;
  return (
    <span
      className="authoring-draft-badge"
      data-status={post.previewStatus}
      title="Only visible in local dev with SANITY_PREVIEW_TOKEN"
    >
      {LABELS[post.previewStatus]}
    </span>
  );
}
