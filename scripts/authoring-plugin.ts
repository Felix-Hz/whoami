import type { IncomingMessage, ServerResponse } from "node:http";
import process from "node:process";
import { loadEnv, type Plugin } from "vite";
import { fetchPosts, writePosts } from "./fetch-content";

// Dev-only authoring endpoints. apply: "serve" keeps all of this out of `vite build`.
// Tokens stay in this Node process; the browser only ever sees the JSON responses below.

const WORKFLOWS = [
  { file: "build-and-deploy.yml", name: "Build & Deploy" },
  { file: "content-update.yml", name: "Content Update" },
];

type DeployStatus = "queued" | "running" | "succeeded" | "failed" | "cancelled";

interface GitHubRun {
  status: string;
  conclusion: string | null;
  html_url: string;
  created_at: string;
  updated_at: string;
  head_commit?: { message?: string } | null;
}

function toStatus(run: GitHubRun): DeployStatus {
  if (run.status === "in_progress") return "running";
  if (run.status !== "completed") return "queued";
  if (run.conclusion === "success") return "succeeded";
  if (run.conclusion === "cancelled" || run.conclusion === "skipped") return "cancelled";
  return "failed";
}

function githubError(res: Response): string {
  if (res.status !== 403 && res.status !== 429) return `GitHub API ${res.status}`;
  const reset = Number(res.headers.get("x-ratelimit-reset")) * 1000;
  return `GitHub rate limit reached${reset ? ` until ${new Date(reset).toLocaleTimeString()}` : ""}`;
}

function json(res: ServerResponse, status: number, body: unknown) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(body));
}

// Only the site's own pages may trigger a refresh, not some other tab posting to localhost
function isSameOrigin(req: IncomingMessage): boolean {
  const site = req.headers["sec-fetch-site"];
  if (site) return site === "same-origin";
  const origin = req.headers.origin;
  return !origin || origin === `http://${req.headers.host}`;
}

export function authoring(): Plugin {
  let env: Record<string, string> = {};
  let deploysCache: { at: number; body: unknown } | undefined;

  // Per-workflow ETag and last run, reused on 304s; conditional requests don't count against the rate limit
  const conditional = new Map<string, { etag: string; run: GitHubRun | undefined }>();

  async function latestRun(file: string): Promise<GitHubRun | undefined> {
    const repo = env.GITHUB_REPOSITORY || "Felix-Hz/whoami";
    const headers: Record<string, string> = {
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    };
    if (env.GITHUB_TOKEN) headers.Authorization = `Bearer ${env.GITHUB_TOKEN}`;
    const cached = conditional.get(file);
    if (cached) headers["If-None-Match"] = cached.etag;

    const res = await fetch(`https://api.github.com/repos/${repo}/actions/workflows/${file}/runs?per_page=1`, {
      headers,
    });
    if (res.status === 304) return cached?.run;
    if (!res.ok) throw new Error(githubError(res));

    const run = ((await res.json()) as { workflow_runs: GitHubRun[] }).workflow_runs[0];
    const etag = res.headers.get("etag");
    if (etag) conditional.set(file, { etag, run });
    return run;
  }

  // The repo is public, so this works without a token (60 requests/hour). A token only raises the limit.
  async function readDeploys() {
    if (deploysCache && Date.now() - deploysCache.at < 5_000) return deploysCache.body;

    const runs = await Promise.all(
      WORKFLOWS.map(async ({ file, name }) => {
        const run = await latestRun(file);
        if (!run) return { name, status: null };
        return {
          name,
          status: toStatus(run),
          url: run.html_url,
          at: run.status === "completed" ? run.updated_at : run.created_at,
          commit: run.head_commit?.message?.split("\n")[0] ?? null,
        };
      }),
    );

    const body = { enabled: true, runs };
    deploysCache = { at: Date.now(), body };
    return body;
  }

  async function refreshPosts(): Promise<number> {
    if (!env.SANITY_PROJECT_ID) throw new Error("SANITY_PROJECT_ID is not set");
    const posts = await fetchPosts({
      projectId: env.SANITY_PROJECT_ID,
      dataset: env.SANITY_DATASET,
      previewToken: env.SANITY_PREVIEW_TOKEN || undefined,
    });
    writePosts(posts);
    return posts.length;
  }

  return {
    name: "whoami:authoring",
    apply: "serve",

    config(_, { mode }) {
      env = loadEnv(mode, process.cwd(), "");
      return {
        define: {
          __AUTHORING_STUDIO_URL__: JSON.stringify(env.STUDIO_URL || "http://localhost:3333"),
        },
      };
    },

    configureServer(server) {
      server.middlewares.use("/__authoring/refresh", async (req, res) => {
        if (req.method !== "POST") return json(res, 405, { error: "POST only" });
        if (!isSameOrigin(req)) return json(res, 403, { error: "cross-origin request refused" });
        try {
          const count = await refreshPosts();
          server.config.logger.info(`[authoring] refreshed ${count} posts`, { timestamp: true });
          json(res, 200, { count, preview: Boolean(env.SANITY_PREVIEW_TOKEN) });
          server.ws.send({ type: "full-reload" });
        } catch (err) {
          json(res, 502, { error: err instanceof Error ? err.message : String(err) });
        }
      });

      server.middlewares.use("/__authoring/deploys", async (req, res) => {
        if (req.method !== "GET") return json(res, 405, { error: "GET only" });
        try {
          json(res, 200, await readDeploys());
        } catch (err) {
          json(res, 502, { enabled: true, error: err instanceof Error ? err.message : String(err) });
        }
      });
    },
  };
}
