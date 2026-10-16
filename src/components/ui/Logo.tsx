export function Logo() {
  return (
    <a
      href="/"
      aria-label="whoami, home"
      className="inline-flex items-baseline font-pixel text-wordmark text-accent hover:text-ink py-3 -my-3"
    >
      <span aria-hidden="true">$ whoami</span>
      {/* The cursor holds still; motion is reserved for the story, not the chrome */}
      <span aria-hidden="true" className="inline-block w-[0.55em] h-[1em] bg-current ml-px translate-y-[0.12em]" />
    </a>
  );
}
