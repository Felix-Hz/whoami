import { useState } from "preact/hooks";
import { getPostBySlug } from "@/data/posts";
import { DeployStatus } from "./DeployStatus";

const STUDIO = __AUTHORING_STUDIO_URL__.replace(/\/$/, "");
const COLLAPSED_KEY = "authoring:collapsed";

function readCollapsed(): boolean {
  try {
    return localStorage.getItem(COLLAPSED_KEY) === "1";
  } catch {
    return false;
  }
}

function useCollapsed() {
  const [collapsed, setCollapsed] = useState(readCollapsed);
  const toggle = () =>
    setCollapsed((value) => {
      try {
        localStorage.setItem(COLLAPSED_KEY, value ? "0" : "1");
      } catch {
        // Storage blocked; the toggle still works for this page view
      }
      return !value;
    });
  return [collapsed, toggle] as const;
}

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
  const [collapsed, toggle] = useCollapsed();

  if (path !== "/blog" && !slug) return null;

  return (
    <aside aria-label="Authoring tools (dev only)" className="authoring-toolbar">
      <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
        <button
          type="button"
          onClick={toggle}
          aria-expanded={!collapsed}
          aria-controls="authoring-tools"
          title={collapsed ? "Show dev tools" : "Collapse dev tools"}
          className="proof-label"
        >
          {collapsed ? "proof ▸" : "proof ▾"}
        </button>
        {!collapsed && <RefreshButton />}
        {!collapsed && path === "/blog" && (
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
        {!collapsed && post && (
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
      <div id="authoring-tools" hidden={collapsed}>
        <DeployStatus />
      </div>
    </aside>
  );
}
