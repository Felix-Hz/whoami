export interface Spring {
  x: number;
  v: number;
}

export const spring0 = (x = 0): Spring => ({ x, v: 0 });

// Critically damped spring: no overshoot, no velocity jump when the target moves mid-flight,
// and the same feel at 30, 60 or 120 fps because it integrates real elapsed time
export function spring(s: Spring, target: number, omega: number, dt: number) {
  const f = 1 + 2 * dt * omega;
  const hoo = dt * omega * omega;
  const det = 1 / (f + dt * hoo);
  const x = (f * s.x + dt * s.v + dt * hoo * target) * det;
  s.v = (s.v + hoo * (target - s.x)) * det;
  s.x = x;
}

// Seconds since the last frame, clamped so a backgrounded tab doesn't make everything jump
export function frameClock() {
  let last = 0;
  return {
    tick(now: number) {
      const dt = last ? Math.min(1 / 30, (now - last) / 1000) : 1 / 60;
      last = now;
      return dt;
    },
    reset() {
      last = 0;
    },
  };
}

export const prefersReducedMotion = () =>
  typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;
