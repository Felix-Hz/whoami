import { faceAscii } from "@/assets/ascii-face";
import { useReducedMotion } from "@/hooks/useReducedMotion";

const lines = faceAscii.split("\n").filter((line) => line.length > 0);

interface AsciiPortraitProps {
  compact?: boolean;
}

export function AsciiPortrait({ compact = false }: AsciiPortraitProps) {
  const reducedMotion = useReducedMotion();

  return (
    <div className="relative">
      {/* Terminal frame */}
      <div className="border border-border rounded-md overflow-hidden">
        {/* Title bar */}
        <div
          className={`flex items-center gap-1.5 border-b border-border bg-surface-primary ${compact ? "px-2 py-1" : "px-3 py-1.5"}`}
        >
          <span className={`rounded-full bg-accent/40 ${compact ? "w-1.5 h-1.5" : "w-2.5 h-2.5"}`} />
          <span className={`rounded-full bg-border ${compact ? "w-1.5 h-1.5" : "w-2.5 h-2.5"}`} />
          <span className={`rounded-full bg-border ${compact ? "w-1.5 h-1.5" : "w-2.5 h-2.5"}`} />
          <span className={`text-text-tertiary font-[var(--font-mono)] ml-2 ${compact ? "text-[10px]" : "text-xs"}`}>
            whoami
          </span>
        </div>

        {/* ASCII face */}
        <div className={`bg-surface-primary flex justify-center ${compact ? "p-2" : "p-3"}`}>
          <pre
            aria-hidden="true"
            className={`group font-mono overflow-hidden leading-none cursor-default select-none ${
              compact ? "text-[3px] sm:text-[3.5px]" : "text-[4px] md:text-[5px] lg:text-[6px]"
            } ${reducedMotion ? "" : "animate-[breathe_4s_ease-in-out_infinite]"}`}
          >
            {lines.map((line, i) => (
              <span
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
