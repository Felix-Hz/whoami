// How far the hero has scrolled away, 0 at rest to 1 once it's mostly gone. One passive listener and a
// cached height, so readers on every frame pay for a property read, not a layout.

let hero: HTMLElement | null = null;
let span = 1;
let value = 0;
const listeners = new Set<() => void>();

const measure = () => {
  if (hero) span = Math.max(1, hero.offsetTop + hero.offsetHeight * 0.85);
};
const update = () => {
  const next = Math.min(1, Math.max(0, window.scrollY / span));
  if (next === value) return;
  value = next;
  for (const fn of listeners) fn();
};

let resizer: ResizeObserver | null = null;

export function watchHero(el: HTMLElement) {
  if (hero === el) return;
  hero = el;
  measure();
  update();
  resizer?.disconnect();
  resizer = new ResizeObserver(() => {
    measure();
    update();
  });
  resizer.observe(el);
  window.addEventListener("scroll", update, { passive: true });
}

export function unwatchHero(el: HTMLElement) {
  if (hero !== el) return;
  hero = null;
  resizer?.disconnect();
  resizer = null;
  window.removeEventListener("scroll", update);
  value = 0;
}

export const heroProgress = () => value;

export function onHeroProgress(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
