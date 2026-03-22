export function Logo({ className }: { className?: string }) {
  return (
    <a href="/" className={`group inline-flex items-baseline font-[var(--font-mono)] text-xl ${className ?? ""}`}>
      <span className="text-accent font-bold">$</span>
      <span className="ml-1.5 tracking-tight">
        {"whoami".split("").map((char, i) => (
          <span
            key={i}
            className="text-text-primary transition-colors duration-normal group-hover:text-accent"
            style={{ transitionDelay: `${i * 40}ms` }}
          >
            {char}
          </span>
        ))}
      </span>
      <span className="inline-block w-[0.5em] h-[1em] bg-text-primary animate-[blink_1s_step-end_infinite] ml-px translate-y-px" />
    </a>
  );
}
