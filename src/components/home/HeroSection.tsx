import type { RoutableProps } from "preact-router";
import { isoDate, PostIndex } from "@/components/blog/PostIndex";
import { getAllPosts } from "@/data/posts";
import { AsciiPortrait } from "./AsciiPortrait";
import { Chapter } from "./Chapter";
import { GetInTouch } from "./GetInTouch";
import { Projects } from "./Projects";

const HOME_POSTS = 5;

export function HeroSection(_props: RoutableProps) {
  const posts = getAllPosts();
  const latest = posts[0];

  return (
    <>
      <section aria-labelledby="name" className="relative pt-6 pb-14 md:pt-16 md:pb-24 lg:pt-20 lg:pb-28" data-hero>
        <div className="page-grid relative z-10">
          <div className="col-margin meta order-3 md:order-none mt-8 md:mt-0 md:pt-[1.6vw]">
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

          <h1
            id="name"
            className="display text-display col-span-full md:col-start-3 md:col-span-6 lg:col-start-4 lg:col-span-9"
          >
            felix hernandez vieyra
          </h1>

          <p className="text-lead col-span-full md:col-start-3 md:col-span-6 lg:col-start-4 lg:col-span-5 mt-7 md:mt-10">
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
