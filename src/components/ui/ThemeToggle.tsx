// Sun and moon, both in the markup; CSS shows the one for the theme you'd switch to, so the prerendered
// HTML never has to guess the reader's theme. The choice is remembered and applied before first paint
// by the inline script in index.html.

const THEME_COLOR = { light: "#fafaf8", dark: "#0e1120" };

function currentTheme(): "light" | "dark" {
  const set = document.documentElement.dataset.theme;
  if (set === "light" || set === "dark") return set;
  return matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function toggle() {
  const next = currentTheme() === "dark" ? "light" : "dark";
  document.documentElement.dataset.theme = next;
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", THEME_COLOR[next]);
  try {
    localStorage.setItem("theme", next);
  } catch {
    // Storage blocked: the switch still applies to this visit
  }
}

export function ThemeToggle() {
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="switch between light and dark theme"
      title="light / dark"
      className="theme-toggle inline-grid place-items-center w-9 h-9 -my-2 text-ink-2 hover:text-accent cursor-pointer"
    >
      {/* Moon: shown in light, switches to dark */}
      <svg className="theme-moon" width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
        <path d="M13.2 10.1A5.6 5.6 0 0 1 5.9 2.8a5.6 5.6 0 1 0 7.3 7.3Z" fill="currentColor" />
      </svg>
      {/* Sun: shown in dark, switches to light */}
      <svg className="theme-sun" width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
        <circle cx="8" cy="8" r="3.1" fill="currentColor" />
        <g stroke="currentColor" stroke-width="1.4" stroke-linecap="square">
          <path d="M8 1v1.6M8 13.4V15M1 8h1.6M13.4 8H15M3 3l1.1 1.1M11.9 11.9 13 13M3 13l1.1-1.1M11.9 4.1 13 3" />
        </g>
      </svg>
    </button>
  );
}
