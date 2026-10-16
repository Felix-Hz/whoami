import { prefersReducedMotion } from "./spring";

// The dither knob's state, 0..10. 0 is off (the static dot grid), 1 is the designed field (the default),
// and every step up adds a visible amount of ink, to most of the page at 10. Remembered per browser; phones and reduced motion start off unless the reader turned it on.

export const LEVEL_MIN = 0;
export const LEVEL_MAX = 10;
export const LEVEL_DEFAULT = 1;
// v2: level 1 became the designed field; older saved levels meant something else
const KEY = "dither-v2";

const listeners = new Set<(level: number) => void>();
let level: number | null = null;
let lastOn = LEVEL_DEFAULT;

function stored(): number | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw === null) return null;
    const n = Number(raw);
    return Number.isFinite(n) ? Math.min(LEVEL_MAX, Math.max(LEVEL_MIN, Math.round(n))) : null;
  } catch {
    return null;
  }
}

export function ditherLevel(): number {
  if (level === null) {
    const saved = typeof window === "undefined" ? null : stored();
    // Off by default on touch phones and for reduced motion; the knob can still turn it on
    const offByDefault =
      typeof window !== "undefined" &&
      (prefersReducedMotion() || matchMedia("(hover: none) and (pointer: coarse)").matches);
    level = saved ?? (offByDefault ? 0 : LEVEL_DEFAULT);
    if (level > 0) lastOn = level;
  }
  return level;
}

export function setDitherLevel(next: number) {
  const clamped = Math.min(LEVEL_MAX, Math.max(LEVEL_MIN, Math.round(next)));
  if (clamped === ditherLevel()) return;
  level = clamped;
  if (clamped > 0) lastOn = clamped;
  try {
    localStorage.setItem(KEY, String(clamped));
  } catch {
    // Storage blocked: the knob still works for this visit
  }
  for (const fn of listeners) fn(clamped);
}

// Click: off, or back on at the last level it was turned up to
export function toggleDither() {
  setDitherLevel(ditherLevel() > 0 ? 0 : lastOn || LEVEL_DEFAULT);
}

export function onDitherLevel(fn: (level: number) => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

// What each knob level means to the shader: [noise threshold, density, spread].
// One curve from the designed field (level 1) to the top (level 10): the threshold falls so dots cover
// more of the page, the density rises, and the field spreads right. Steps are placed along it so each
// one roughly multiplies the inked area (measured: about 0.05% of the screen at 2 up to 4.7% at 10),
// so no step is dead.
export type KnobParams = [threshold: number, density: number, spread: number];

const STEPS = [0, 0, 0.455, 0.53, 0.605, 0.66, 0.716, 0.77, 0.84, 0.92, 1];
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export function ditherParams(l: number): KnobParams {
  const s = STEPS[Math.min(LEVEL_MAX, Math.max(LEVEL_MIN, Math.round(l)))];
  return [lerp(0.45, 0.12, s), lerp(0.22, 0.95, s ** 1.4), s];
}
