import { prefersReducedMotion } from "./spring";

// The dither knob's state, 0..10. 0 is off (the static dot grid), 5 is the designed density, 10 is about
// four and a half times denser and spans the whole page. Remembered per browser; reduced motion starts off unless the reader turned it on.

export const LEVEL_MIN = 0;
export const LEVEL_MAX = 10;
export const LEVEL_DEFAULT = 5;
const KEY = "dither";

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
    level = saved ?? (typeof window !== "undefined" && prefersReducedMotion() ? 0 : LEVEL_DEFAULT);
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

// Shader density multiplier: 1 at the default, about 4.6 at the top (where the field also spans the
// full width, see the shader), a whisper at 1
export const ditherGain = (l: number) => (l / LEVEL_DEFAULT) ** 2.2;
