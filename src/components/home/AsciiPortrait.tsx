import { useEffect, useRef } from "preact/hooks";
import { faceAscii } from "@/assets/ascii-face";
import { heroProgress, onHeroProgress } from "@/motion/heroProgress";
import { frameClock, prefersReducedMotion, type Spring, spring, spring0 } from "@/motion/spring";

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

// 8x8 ordered-dither threshold per cell, the same matrix the background shader prints with
const bayer2 = (x: number, y: number) => (Math.floor(x) * 0.5 + Math.floor(y) ** 2 * 0.75) % 1;
const bayer4 = (x: number, y: number) => bayer2(x / 2, y / 2) * 0.25 + bayer2(x, y);
const threshold: number[][] = cells.map((row, r) =>
  row.map((_, c) => (bayer4(c / 2, r / 2) * 0.25 + bayer2(c, r)) % 1),
);

// flip: 0 prints the portrait, 1 its negative. gone: 0 keeps every character, 1 dissolves them all.
const print = (flip: (row: number, col: number) => number, gone = 0) =>
  cells
    .map((row, r) =>
      row
        .map((v, c) => (v < 0 || threshold[r][c] < gone ? " " : RAMP[Math.round(v + (TOP - 2 * v) * flip(r, c))]))
        .join(""),
    )
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

interface Wave {
  radius: Spring;
  origin: { x: number; y: number };
  pointer: { x: number; y: number; inside: boolean };
}

// Far enough to cover every cell from the wave's origin, plus the ragged front
function reachOf(origin: { x: number; y: number }) {
  const corners = [
    [0, 0],
    [COLS, 0],
    [0, ROWS],
    [COLS, ROWS],
  ];
  return Math.max(...corners.map(([x, y]) => Math.hypot((x - origin.x) * CELL_W, y - origin.y))) + FEATHER * 1.5;
}

// Advances the wave one frame; true once it has come to rest
function stepWave(w: Wave, dt: number): boolean {
  const { radius, origin, pointer } = w;
  // While inside, the origin drifts after the pointer so the ink leans toward it
  if (pointer.inside) {
    const k = 1 - Math.exp(-dt * 2.5);
    origin.x += (pointer.x - origin.x) * k;
    origin.y += (pointer.y - origin.y) * k;
  }
  const target = pointer.inside ? reachOf(origin) : 0;
  spring(radius, target, pointer.inside ? 3.2 : 2.6, dt);
  const still = Math.abs(radius.v) < 0.02;
  if (!pointer.inside && still && radius.x < 0.05) {
    radius.x = 0;
    radius.v = 0;
    return true;
  }
  return pointer.inside && still && radius.x >= target - 0.5;
}

// How far each cell has turned toward its negative, 0..1, for a wave of radius R at time t
function waveFlip(w: Wave, t: number) {
  const R = w.radius.x;
  const { x: ox, y: oy } = w.origin;
  if (R <= 0) return () => 0;
  return (r: number, c: number) => {
    const d = Math.hypot((c - ox) * CELL_W, r - oy);
    // The front wobbles with slow noise, so it reads like ink spreading, not a circle
    const edge = noise(c * 0.11 + t * 0.6, r * 0.16 - t * 0.4) * FEATHER * 0.55;
    return smooth((R - d + edge) / FEATHER);
  };
}

/**
 * Printed straight onto the page in the pixel face.
 * - Pointing at it prints its negative: the ink flows out from the pointer in a ragged wave, each
 *   character stepping through the ramp toward its opposite, and ebbs back toward where the pointer left.
 * - Scrolling the hero away dissolves it, character by character in dither order, back into the field.
 * Without JS the two prints crossfade on hover; with reduced motion the negative swaps instantly and
 * nothing dissolves.
 */
export function AsciiPortrait({ className = "" }: { className?: string }) {
  const root = useRef<HTMLDivElement>(null);
  const live = useRef<HTMLPreElement>(null);

  useEffect(() => {
    const el = root.current;
    const pre = live.current;
    if (!el || !pre) return;
    const reduce = prefersReducedMotion();
    const hover = matchMedia("(hover: hover)").matches;
    if (hover) el.dataset.fluid = "";

    const wave: Wave = {
      radius: spring0(),
      origin: { x: COLS / 2, y: ROWS / 2 },
      pointer: { x: COLS / 2, y: ROWS / 2, inside: false },
    };
    const { radius, origin, pointer } = wave;
    const clock = frameClock();
    let raf = 0;
    let shown = portrait;
    let waving = false;

    const toCell = (e: PointerEvent) => {
      const q = pre.getBoundingClientRect();
      return { x: ((e.clientX - q.left) / q.width) * COLS, y: ((e.clientY - q.top) / q.height) * ROWS };
    };

    const render = (now: number) => {
      // The dissolve starts once the hero is a fifth of the way gone, and finishes a little before it leaves
      const gone = reduce ? 0 : smooth((heroProgress() - 0.2) / 0.7);
      const next = print(waveFlip(wave, now / 1000), gone);
      if (next !== shown) pre.textContent = shown = next;
    };

    const tick = (now: number) => {
      waving = !stepWave(wave, clock.tick(now));
      render(now);
      raf = waving ? requestAnimationFrame(tick) : 0;
    };
    const start = () => {
      if (raf) return;
      clock.reset();
      raf = requestAnimationFrame(tick);
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

    // Scroll only re-prints, once per frame; the wave's own loop already renders every frame while it runs
    let scrollFrame = 0;
    const stopScroll = reduce
      ? () => false
      : onHeroProgress(() => {
          if (waving || scrollFrame) return;
          scrollFrame = requestAnimationFrame((now) => {
            scrollFrame = 0;
            render(now);
          });
        });

    if (hover) {
      el.addEventListener("pointerenter", enter);
      el.addEventListener("pointermove", move);
      el.addEventListener("pointerleave", leave);
    }
    return () => {
      cancelAnimationFrame(raf);
      cancelAnimationFrame(scrollFrame);
      stopScroll();
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
      data-portrait
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
