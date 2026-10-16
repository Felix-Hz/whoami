import { useEffect, useRef, useState } from "preact/hooks";
import {
  ditherLevel,
  LEVEL_DEFAULT,
  LEVEL_MAX,
  LEVEL_MIN,
  onDitherLevel,
  setDitherLevel,
  toggleDither,
} from "@/motion/ditherLevel";

// An amp-style knob for the home page's dither: click to switch it on and off, press and drag to turn
// it (sideways or up and down), arrows to step it. 0 is off, 5 is the designed density, 10 is the top.

const SWEEP = 270; // degrees from 0 to 10, like an amp's 7 o'clock to 5 o'clock
const PX_PER_STEP = 14;
const DRAG_THRESHOLD = 4;

const angleOf = (level: number) => -SWEEP / 2 + (level / LEVEL_MAX) * SWEEP;

export function DitherKnob() {
  // The prerendered page shows the default; the reader's saved level arrives on mount
  const [level, setLevel] = useState(LEVEL_DEFAULT);
  const drag = useRef<{ x: number; y: number; start: number; moved: boolean } | null>(null);

  useEffect(() => {
    setLevel(ditherLevel());
    return onDitherLevel(setLevel);
  }, []);

  const onPointerDown = (e: PointerEvent) => {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    drag.current = { x: e.clientX, y: e.clientY, start: ditherLevel(), moved: false };
  };
  const onPointerMove = (e: PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.x;
    const dy = d.y - e.clientY; // up turns it up, like a fader
    if (!d.moved && Math.abs(dx) + Math.abs(dy) < DRAG_THRESHOLD) return;
    d.moved = true;
    setDitherLevel(d.start + (dx + dy) / PX_PER_STEP);
  };
  const onPointerUp = () => {
    const d = drag.current;
    drag.current = null;
    if (d && !d.moved) toggleDither();
  };
  const onKeyDown = (e: KeyboardEvent) => {
    const step: Record<string, () => void> = {
      ArrowRight: () => setDitherLevel(ditherLevel() + 1),
      ArrowUp: () => setDitherLevel(ditherLevel() + 1),
      ArrowLeft: () => setDitherLevel(ditherLevel() - 1),
      ArrowDown: () => setDitherLevel(ditherLevel() - 1),
      Home: () => setDitherLevel(LEVEL_MIN),
      End: () => setDitherLevel(LEVEL_MAX),
      Enter: toggleDither,
      " ": toggleDither,
    };
    const action = step[e.key];
    if (!action) return;
    e.preventDefault();
    action();
  };

  const on = level > 0;
  const ticks = Array.from({ length: LEVEL_MAX + 1 }, (_, i) => i);

  return (
    <div
      role="slider"
      tabIndex={0}
      aria-label="dither"
      aria-valuemin={LEVEL_MIN}
      aria-valuemax={LEVEL_MAX}
      aria-valuenow={level}
      aria-valuetext={on ? `${level} of ${LEVEL_MAX}` : "off"}
      title={`dither ${on ? `${level}/${LEVEL_MAX}` : "off"} · click to switch, drag to turn`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onKeyDown={onKeyDown}
      className="dither-knob inline-grid place-items-center w-9 h-9 -my-2 cursor-grab active:cursor-grabbing touch-none select-none"
    >
      <svg width="26" height="26" viewBox="-16 -16 32 32" aria-hidden="true">
        {/* Scale: 0 to 10 around the dial, lit up to the current level */}
        {ticks.map((i) => (
          <line
            key={i}
            x1="0"
            y1="-13.2"
            x2="0"
            y2={i % 5 === 0 ? "-15.6" : "-14.8"}
            transform={`rotate(${angleOf(i)})`}
            stroke={on && i <= level ? "var(--color-accent)" : "var(--color-rule)"}
            stroke-width={i % 5 === 0 ? 1.6 : 1.1}
          />
        ))}
        {/* The knob itself, with its pointer line */}
        <circle
          r="9.6"
          fill="var(--color-paper)"
          stroke={on ? "var(--color-ink-2)" : "var(--color-ink-3)"}
          stroke-width="1.2"
        />
        <circle r="6.6" fill="none" stroke="var(--color-rule)" stroke-width="0.8" />
        <line
          x1="0"
          y1="-2.4"
          x2="0"
          y2="-8.4"
          transform={`rotate(${angleOf(level)})`}
          stroke={on ? "var(--color-accent)" : "var(--color-ink-3)"}
          stroke-width="1.8"
          stroke-linecap="round"
          className="knob-pointer"
        />
      </svg>
    </div>
  );
}
