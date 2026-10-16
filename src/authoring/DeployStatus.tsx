import { useCallback, useEffect, useState } from "preact/hooks";

interface Run {
  name: string;
  status?: "queued" | "running" | "succeeded" | "failed" | "cancelled" | null;
  url?: string;
  at?: string;
  commit?: string | null;
  error?: string;
}

interface Deploys {
  enabled: boolean;
  runs?: Run[];
  error?: string;
}

const POLL_MS = 10_000;
const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

function ago(iso: string): string {
  const s = Math.round((new Date(iso).getTime() - Date.now()) / 1000);
  if (Math.abs(s) < 60) return rtf.format(s, "second");
  if (Math.abs(s) < 3600) return rtf.format(Math.round(s / 60), "minute");
  if (Math.abs(s) < 86400) return rtf.format(Math.round(s / 3600), "hour");
  return rtf.format(Math.round(s / 86400), "day");
}

const MARK = { queued: "○", running: "◐", succeeded: "●", failed: "✕", cancelled: "–" } as const;

export function DeployStatus() {
  const [data, setData] = useState<Deploys | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/__authoring/deploys").catch(() => null);
    setData(res?.ok ? ((await res.json()) as Deploys) : { enabled: true, error: "deploy status unavailable" });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Poll only while something is in flight; otherwise this refreshes with the page
  const inFlight = data?.runs?.some((r) => r.status === "queued" || r.status === "running");
  useEffect(() => {
    if (!inFlight) return;
    const id = setInterval(load, POLL_MS);
    return () => clearInterval(id);
  }, [inFlight, load]);

  if (!data?.enabled) return null;
  if (data.error) return <span className="text-text-tertiary">{data.error}</span>;

  return (
    <ul className="flex flex-col items-end gap-0.5">
      {data.runs?.map((run) => (
        <li key={run.name}>
          {run.error || !run.status ? (
            <span className="text-text-tertiary">
              {run.name}: {run.error || "no runs"}
            </span>
          ) : (
            <a href={run.url} target="_blank" rel="noreferrer" title={run.commit ?? undefined}>
              {MARK[run.status]} {run.name} {run.status}
              {run.at && <span className="text-text-tertiary"> · {ago(run.at)}</span>}
            </a>
          )}
        </li>
      ))}
    </ul>
  );
}
