import { faceAscii } from "@/assets/ascii-face";
import { useReducedMotion } from "@/hooks/useReducedMotion";

const lines = faceAscii.split("\n").filter((line) => line.length > 0);

export function AsciiPortrait() {
  const reducedMotion = useReducedMotion();

  return (
    <div className="relative">
      {/* Terminal frame */}
      <div className="border border-border rounded-md overflow-hidden">
        {/* Title bar */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 border-b border-border bg-surface-primary">
          <span className="w-2.5 h-2.5 rounded-full bg-accent/40" />
          <span className="w-2.5 h-2.5 rounded-full bg-border" />
          <span className="w-2.5 h-2.5 rounded-full bg-border" />
          <span className="text-text-tertiary text-xs font-[var(--font-mono)] ml-2">whoami</span>
        </div>

        {/* ASCII face */}
        <div className="p-3 bg-surface-primary">
          <pre
            aria-hidden="true"
            className={`group font-mono overflow-y-hidden leading-none text-[4px] md:text-[5px] lg:text-[6px] cursor-default select-none ${
              reducedMotion ? "" : "animate-[breathe_4s_ease-in-out_infinite]"
            }`}
          >
            {lines.map((line, i) => (
              <span
                // biome-ignore lint/suspicious/noArrayIndexKey: static content, never reordered
                key={i}
                className="block text-text-primary transition-colors duration-normal group-hover:text-accent"
                style={{ transitionDelay: reducedMotion ? "0ms" : `${i * 30}ms` }}
              >
                {line}
              </span>
            ))}
          </pre>
        </div>
      </div>
    </div>
  );
}
