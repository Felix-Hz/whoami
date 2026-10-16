import { useState } from "preact/hooks";
import { getPostBySlug } from "@/data/posts";
import { DeployStatus } from "./DeployStatus";

const STUDIO = __AUTHORING_STUDIO_URL__.replace(/\/$/, "");

function RefreshButton() {
  const [state, setState] = useState<"idle" | "busy" | "error">("idle");
  const [error, setError] = useState("");

  async function refresh() {
    setState("busy");
    const res = await fetch("/__authoring/refresh", { method: "POST" }).catch(() => null);
    if (res?.ok) return; // the dev server sends a full reload
    setError(res ? ((await res.json()) as { error?: string }).error || `HTTP ${res.status}` : "dev server unreachable");
    setState("error");
  }

  return (
    <button type="button" onClick={refresh} disabled={state === "busy"} title={error || "Re-fetch posts from Sanity"}>
      {state === "busy" ? "refreshing…" : state === "error" ? "refresh failed ↻" : "↻ refresh"}
    </button>
  );
}

export function Toolbar({ url }: { url: string }) {
  const path = url.split(/[?#]/)[0].replace(/\/$/, "") || "/";
  const slug = path.match(/^\/blog\/([^/]+)$/)?.[1];
  const post = slug ? getPostBySlug(slug) : undefined;

  if (path !== "/blog" && !slug) return null;

  return (
    <aside
      aria-label="Authoring tools (dev only)"
      className="authoring-toolbar fixed bottom-4 right-4 z-50 flex flex-col gap-2 items-end font-[var(--font-mono)] text-xs bg-surface-elevated text-text-primary border border-border-strong p-2 [&_a]:underline [&_button]:underline [&_button]:cursor-pointer [&_button:disabled]:opacity-50"
    >
      <div className="flex items-center gap-3">
        <span className="text-text-tertiary">dev</span>
        <RefreshButton />
        {path === "/blog" && (
          <>
            <a
              href={`${STUDIO}/intent/create/type=post;template=post/`}
              target="_blank"
              rel="noreferrer"
              title="New post"
            >
              + new
            </a>
            <a href={STUDIO} target="_blank" rel="noreferrer">
              open studio
            </a>
          </>
        )}
        {post && (
          <a
            href={`${STUDIO}/intent/edit/id=${post._id};type=post/`}
            target="_blank"
            rel="noreferrer"
            title="Edit in studio"
          >
            ✎ edit
          </a>
        )}
      </div>
      <DeployStatus />
    </aside>
  );
}
