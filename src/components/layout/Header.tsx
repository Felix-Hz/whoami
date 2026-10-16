import { useRef } from "preact/hooks";
import { DitherKnob } from "@/components/ui/DitherKnob";
import { Logo } from "@/components/ui/Logo";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { trackSocialClick } from "@/utils/analytics";
import { CHAPTERS, OUTBOUND } from "./links";

function Chapters({ onNavigate }: { onNavigate?: () => void }) {
  return CHAPTERS.map((c) => (
    <a key={c.href} href={c.href} onClick={onNavigate} className="text-ink-2 hover:text-accent">
      <span className="font-pixel text-accent mr-[0.4em]">{c.n}</span>
      {c.label}
    </a>
  ));
}

function Outbound() {
  return (
    <>
      {OUTBOUND.map((o) => (
        <a
          key={o.href}
          href={o.href}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => trackSocialClick(o.track)}
          className="text-ink-3 hover:text-accent py-2.5 -my-2.5"
        >
          {o.label}
          <span aria-hidden="true" className="ml-[0.15em]">
            ↗
          </span>
          <span className="sr-only"> (opens in a new tab)</span>
        </a>
      ))}
      <a href="/rss.xml" className="text-ink-3 hover:text-accent py-2.5 -my-2.5">
        rss
      </a>
    </>
  );
}

// The knob only exists where the field does: the home page
function Controls({ home }: { home: boolean }) {
  return (
    <>
      {home && <DitherKnob />}
      <ThemeToggle />
    </>
  );
}

export function Header({ home = false }: { home?: boolean }) {
  const menu = useRef<HTMLDetailsElement>(null);
  const close = () => {
    if (menu.current) menu.current.open = false;
  };

  return (
    <header className="page-grid items-baseline py-6 md:py-7 relative z-20">
      <div className="col-span-2 md:col-span-3">
        <Logo />
      </div>

      {/* Desktop and tablet: chapters, then outbound links after a hairline */}
      <nav aria-label="Main" className="hidden md:flex md:col-span-5 lg:col-span-9 justify-end items-baseline meta">
        <div className="flex gap-7">
          <Chapters />
        </div>
        <div className="flex gap-6 ml-7 pl-7 border-l border-rule">
          <Outbound />
        </div>
        <div className="flex items-center gap-1 ml-5 pl-4 border-l border-rule self-center">
          <Controls home={home} />
        </div>
      </nav>

      {/* Phones: one quiet toggle; works without JS because it's a <details> */}
      <div className="md:hidden col-span-2 justify-self-end flex items-center">
        <div className="flex items-center gap-0.5 mr-3 pr-3 border-r border-rule">
          <Controls home={home} />
        </div>
        <details ref={menu} className="group">
          <summary className="meta text-ink-2 list-none cursor-pointer select-none py-3 -my-3 [&::-webkit-details-marker]:hidden">
            index <span className="font-pixel text-accent group-open:hidden">+</span>
            <span className="font-pixel text-accent hidden group-open:inline">−</span>
          </summary>
          <nav
            aria-label="Main"
            className="absolute left-0 right-0 top-full z-30 bg-paper border-b border-rule px-gutter pt-2 pb-6 font-mono text-small text-ink-2 flex flex-col"
          >
            <div className="flex flex-col [&>a]:py-2.5 [&>a]:border-b [&>a]:border-rule">
              <Chapters onNavigate={close} />
            </div>
            <div className="flex gap-6 pt-4">
              <Outbound />
            </div>
          </nav>
        </details>
      </div>
    </header>
  );
}
