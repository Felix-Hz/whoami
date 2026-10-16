import type { BlogPost } from "@/types/blog";

const LABELS = { draft: "DRAFT", changed: "unpublished changes" } as const;

export function PreviewBadge({ post }: { post: BlogPost }) {
  if (!post.previewStatus) return null;
  return (
    <span
      className={`authoring-draft-badge font-mono text-[10px] uppercase tracking-wider px-1.5 py-0.5 border ${
        post.previewStatus === "draft" ? "border-red-600 text-red-600" : "border-amber-600 text-amber-600"
      }`}
      title="Only visible in local dev with SANITY_PREVIEW_TOKEN"
    >
      {LABELS[post.previewStatus]}
    </span>
  );
}
