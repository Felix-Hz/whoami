import { Fragment } from "preact";
import { useEffect, useRef } from "preact/hooks";
import type { RoutableProps } from "preact-router";
import { isoDate, PostIndex } from "@/components/blog/PostIndex";
import { getAllPosts } from "@/data/posts";
import type { DitherHandle } from "@/motion/dither";
import { ditherLevel, ditherParams, onDitherLevel } from "@/motion/ditherLevel";
import { heroProgress, unwatchHero, watchHero } from "@/motion/heroProgress";
import { AsciiPortrait } from "./AsciiPortrait";
import { Chapter } from "./Chapter";
import { GetInTouch } from "./GetInTouch";
import { Projects } from "./Projects";

const HOME_POSTS = 5;
const NAME = ["felix", "hernandez", "vieyra"];

interface NetworkInformation {
  saveData?: boolean;
}

// Every piece of type outside the hero that the faint field must stay clear of. Outermost matches only,
// so a list row counts once rather than once per span inside it.
const PAGE_TYPE =
  "header :is(a, summary, button, [role=slider]), main section:not([data-hero]) :is(h2, p, li, article, .font-pixel, a), footer :is(p, a)";

function pageType(): HTMLElement[] {
  const found = [...document.querySelectorAll<HTMLElement>(PAGE_TYPE)];
  return found.filter((el) => !found.some((other) => other !== el && other.contains(el)));
}

// The shader is code-split and only fetched once the page is idle, after first paint. Reduced motion,
// Save-Data and no WebGL all keep the static dotted poster instead.
function useDither(hero: { current: HTMLElement | null }, canvas: { current: HTMLCanvasElement | null }) {
  useEffect(() => {
    const el = hero.current;
    const cv = canvas.current;
    if (!el || !cv) return;
    watchHero(el);
    // Save-Data skips the shader outright; reduced motion starts with the knob at 0 (see ditherLevel)
    const saveData = (navigator as Navigator & { connection?: NetworkInformation }).connection?.saveData;
    if (saveData) return () => unwatchHero(el);

    let handle: DitherHandle | null = null;
    let booting = false;
    let cancelled = false;

    const boot = async () => {
      if (handle || booting) return;
      booting = true;
      const { startDither } = await import("@/motion/dither");
      const started = await startDither({
        canvas: cv,
        hero: el,
        texts: [el.querySelector<HTMLElement>("[data-thesis]")].filter((x): x is HTMLElement => x !== null),
        quiet: [...el.querySelectorAll<HTMLElement>("#name, [data-margin] > p"), ...pageType()],
        portrait: el.querySelector<HTMLElement>("[data-portrait]"),
        progress: heroProgress,
        knob: ditherParams(ditherLevel()),
        header: document.querySelector<HTMLElement>(".site-header"),
      });
      booting = false;
      if (cancelled) {
        started?.stop();
        return;
      }
      handle = started;
      // The knob may have moved while the shader was compiling
      apply(ditherLevel());
    };

    // The knob: 0 stops the shader and the static grid shows; anything else boots it or retunes it live
    function apply(level: number) {
      if (!handle) {
        if (level > 0) void boot();
        return;
      }
      handle.setEnabled(level > 0);
      if (level > 0) handle.setKnob(ditherParams(level));
    }
    const stopKnob = onDitherLevel(apply);

    const idle = window.requestIdleCallback ?? ((fn: () => void) => window.setTimeout(fn, 300));
    const idleHandle = idle(() => ditherLevel() > 0 && void boot(), { timeout: 2000 });
    return () => {
      cancelled = true;
      window.cancelIdleCallback?.(idleHandle);
      stopKnob();
      handle?.stop();
      unwatchHero(el);
    };
  }, [hero, canvas]);
}

export function HeroSection(_props: RoutableProps) {
  const posts = getAllPosts();
  const latest = posts[0];
  const hero = useRef<HTMLElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  useDither(hero, canvas);

  return (
    <>
      <section
        ref={hero}
        aria-labelledby="name"
        className="hero-poster relative pt-6 pb-14 md:pt-16 md:pb-24 lg:pt-20 lg:pb-28"
        data-hero
      >
        {/* One field behind the whole page; 3px taller than the viewport so it can step with the scroll */}
        <canvas
          ref={canvas}
          aria-hidden="true"
          tabIndex={-1}
          className="fixed left-0 top-0 w-full h-[calc(100lvh+3px)] -z-10 pointer-events-none"
        />
        <div className="page-grid relative z-10">
          <div data-margin className="col-margin meta order-3 md:order-none mt-8 md:mt-0 md:pt-[1.6vw]">
            <p className="text-accent">software engineer</p>
            {latest && (
              <p className="mt-4">
                last entry
                <br />
                <a href={`/blog/${latest.slug}`} className="hover:text-accent">
                  <time dateTime={latest.publishedAt}>{isoDate(latest.publishedAt)}</time>
                </a>
              </p>
            )}
          </div>

          {/* Split into words for the intro; the heading keeps one unsplit accessible name */}
          <h1
            id="name"
            aria-label={NAME.join(" ")}
            className="intro display text-display col-span-full md:col-start-3 md:col-span-6 lg:col-start-4 lg:col-span-9"
          >
            {NAME.map((word, i) => (
              <Fragment key={word}>
                <span aria-hidden="true" className="intro-word" style={{ "--i": i }}>
                  {word}
                </span>
                {i < NAME.length - 1 && " "}
              </Fragment>
            ))}
          </h1>

          <p
            data-thesis
            className="intro-after text-lead col-span-full md:col-start-3 md:col-span-6 lg:col-start-4 lg:col-span-5 mt-7 md:mt-10"
          >
            design software for humans, architect solutions for resilience. security must be part of the mvp.{" "}
            <a
              href="https://peps.python.org/pep-0020/#the-zen-of-python"
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent underline hover:decoration-2"
            >
              simple is better than complex, complex is better than complicated.
            </a>
          </p>

          {/* Phones and tablets: above the name. Desktop: bottom-aligned with the thesis against the right
              gutter, rising beside the name's last line. Sized in vw so it scales with the grid. */}
          <AsciiPortrait className="order-first col-span-full mb-8 text-[1.6vw] md:col-start-3 md:col-span-6 md:text-[1.1vw] lg:order-none lg:col-auto lg:mb-0 lg:absolute lg:right-gutter lg:bottom-0 lg:text-[min(0.6vw,9px)]" />
        </div>
      </section>

      <Chapter id="who" n="01" title="who">
        <p className="text-lead text-ink-2 max-w-[34em]">
          jack of all trades, master of none, though often better than a master of one. i care about systems that bend
          instead of break, and technology is my creative outlet.
        </p>
      </Chapter>

      <Projects />

      {posts.length > 0 && (
        <Chapter id="writing" n="03" title="writing" note="contents">
          <PostIndex posts={posts.slice(0, HOME_POSTS)} thumbs={false} />
          <a
            href="/blog"
            className="inline-block mt-6 font-mono text-meta text-ink underline decoration-accent hover:text-accent"
          >
            all writing →
          </a>
        </Chapter>
      )}

      <GetInTouch />
    </>
  );
}
