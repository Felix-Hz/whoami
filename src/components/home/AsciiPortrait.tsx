import { useEffect, useRef } from "preact/hooks";
import { faceAscii } from "@/assets/ascii-face";

// Density ramp the portrait is drawn with, lightest to darkest
const RAMP = " .:-=+*#%@";
const TOP = RAMP.length - 1;

const lines = faceAscii.split("\n").filter((line) => line.length > 0);
const COLS = Math.max(...lines.map((line) => line.length));
const ROWS = lines.length;

// Ramp index per cell, or -1 outside the head's silhouette (which stays empty in both prints)
const cells: number[][] = lines.map((line) => {
  const start = line.search(/\S/);
  const end = line.trimEnd().length;
  return [...line.padEnd(COLS)].map((ch, i) =>
    start < 0 || i < start || i >= end ? -1 : Math.max(0, RAMP.indexOf(ch)),
  );
});

const print = (flip: (row: number, col: number) => number) =>
  cells
    .map((row, r) => row.map((v, c) => (v < 0 ? " " : RAMP[Math.round(v + (TOP - 2 * v) * flip(r, c))])).join(""))
    .join("\n");

const portrait = print(() => 0);
const negative = print(() => 1);

// Monospace cells are 0.636em wide (Departure Mono's advance) and 1em tall; distances are in em
const CELL_W = 0.636;
const FEATHER = 7;

const hash = (x: number, y: number) => {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return s - Math.floor(s);
};
const noise = (x: number, y: number) => {
  const ix = Math.floor(x),
    iy = Math.floor(y),
    fx = x - ix,
    fy = y - iy;
  const ux = fx * fx * (3 - 2 * fx),
    uy = fy * fy * (3 - 2 * fy);
  const a = hash(ix, iy),
    b = hash(ix + 1, iy),
    c = hash(ix, iy + 1),
    d = hash(ix + 1, iy + 1);
  return (a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy) * 2 - 1;
};
const smooth = (t: number) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));

// Critically damped spring, frame-rate independent
function spring(s: { x: number; v: number }, target: number, omega: number, dt: number) {
  const f = 1 + 2 * dt * omega,
    oo = omega * omega,
    hoo = dt * oo,
    hhoo = dt * hoo;
  const det = 1 / (f + hhoo);
  const x = (f * s.x + dt * s.v + hhoo * target) * det;
  s.v = (s.v + hoo * (target - s.x)) * det;
  s.x = x;
}

/**
 * Printed straight onto the page in the pixel face. Pointing at it prints its negative: the ink
 * flows out from the pointer in a ragged wave, each character stepping through the ramp toward
 * its opposite, and ebbs back toward wherever the pointer leaves.
 * Without JS the two prints crossfade on hover; with reduced motion they swap instantly.
 */
export function AsciiPortrait({ className = "" }: { className?: string }) {
  const root = useRef<HTMLDivElement>(null);
  const live = useRef<HTMLPreElement>(null);

  useEffect(() => {
    const el = root.current;
    const pre = live.current;
    if (!el || !pre || !matchMedia("(hover: hover)").matches) return;
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.dataset.fluid = "";

    const radius = { x: 0, v: 0 };
    const origin = { x: COLS / 2, y: ROWS / 2 };
    const pointer = { x: origin.x, y: origin.y, inside: false };
    let raf = 0;
    let last = 0;
    let shown = portrait;

    const toCell = (e: PointerEvent) => {
      const q = pre.getBoundingClientRect();
      return { x: ((e.clientX - q.left) / q.width) * COLS, y: ((e.clientY - q.top) / q.height) * ROWS };
    };
    // Far enough to cover every cell from the current origin, plus the ragged front
    const reach = () =>
      Math.max(
        ...[
          [0, 0],
          [COLS, 0],
          [0, ROWS],
          [COLS, ROWS],
        ].map(([x, y]) => Math.hypot((x - origin.x) * CELL_W, y - origin.y)),
      ) +
      FEATHER * 1.5;

    const render = (now: number) => {
      const t = now / 1000;
      const R = radius.x;
      const next = print((r, c) => {
        const d = Math.hypot((c - origin.x) * CELL_W, r - origin.y);
        // The front wobbles with slow noise, so it reads like ink spreading, not a circle
        const edge = noise(c * 0.11 + t * 0.6, r * 0.16 - t * 0.4) * FEATHER * 0.55;
        return smooth((R - d + edge) / FEATHER);
      });
      if (next !== shown) pre.textContent = shown = next;
    };

    const tick = (now: number) => {
      const dt = Math.min(1 / 30, last ? (now - last) / 1000 : 1 / 60);
      last = now;
      // While inside, the origin drifts after the pointer so the ink leans toward it
      if (pointer.inside) {
        origin.x += (pointer.x - origin.x) * (1 - Math.exp(-dt * 2.5));
        origin.y += (pointer.y - origin.y) * (1 - Math.exp(-dt * 2.5));
      }
      spring(radius, pointer.inside ? reach() : 0, pointer.inside ? 3.2 : 2.6, dt);
      render(now);
      const settled = Math.abs(radius.v) < 0.02 && (pointer.inside ? radius.x >= reach() - 0.5 : radius.x < 0.05);
      if (settled && !pointer.inside) {
        radius.x = radius.v = 0;
        pre.textContent = shown = portrait;
        raf = 0;
        return;
      }
      // Fully inverted and still: keep breathing the edge only while the front is on the face
      raf = settled ? 0 : requestAnimationFrame(tick);
    };
    const start = () => {
      if (!raf) {
        last = 0;
        raf = requestAnimationFrame(tick);
      }
    };

    const enter = (e: PointerEvent) => {
      const p = toCell(e);
      // A fresh wave starts where the pointer came in; a wave still ebbing keeps its origin
      if (radius.x < 1) Object.assign(origin, p);
      Object.assign(pointer, p, { inside: true });
      if (reduce) pre.textContent = shown = negative;
      else start();
    };
    const move = (e: PointerEvent) => {
      Object.assign(pointer, toCell(e));
      if (!reduce && pointer.inside) start();
    };
    const leave = (e: PointerEvent) => {
      const p = toCell(e);
      Object.assign(pointer, p, { inside: false });
      // Ebb back toward where the pointer left
      Object.assign(origin, p);
      if (reduce) pre.textContent = shown = portrait;
      else start();
    };

    el.addEventListener("pointerenter", enter);
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerleave", leave);
    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener("pointerenter", enter);
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerleave", leave);
      delete el.dataset.fluid;
    };
  }, []);

  return (
    <div
      ref={root}
      aria-hidden="true"
      className={`group grid font-pixel leading-none select-none text-ink ${className}`}
    >
      <pre
        ref={live}
        className="m-0 whitespace-pre [grid-area:1/1] transition-opacity duration-300 ease-out group-hover:opacity-0 group-data-fluid:group-hover:opacity-100 motion-reduce:transition-none"
      >
        {portrait}
      </pre>
      <pre className="m-0 whitespace-pre [grid-area:1/1] opacity-0 pointer-events-none transition-opacity duration-300 ease-out group-hover:opacity-100 group-data-fluid:hidden motion-reduce:transition-none">
        {negative}
      </pre>
    </div>
  );
}
