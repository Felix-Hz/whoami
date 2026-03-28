import type { RoutableProps } from "preact-router";
import { AsciiPortrait } from "./AsciiPortrait";
import { GetInTouch } from "./GetInTouch";
import { Projects } from "./Projects";

const NAME = "felix hernandez vieyra";

export function HeroSection(_props: RoutableProps) {
  return (
    <section className="flex-1 flex items-center px-6 md:px-8 lg:px-16 pt-20 md:pt-24 lg:pt-32 pb-8 md:pb-12 lg:pb-20">
      {/* Mobile: portrait above name / Desktop: editorial grid */}
      <div className="w-full max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
        {/* ASCII portrait — mobile: compact above name / desktop: right column */}
        <div className="lg:hidden flex justify-center animate-fade-up" style={{ animationDelay: "50ms" }}>
          <div className="w-40 sm:w-52">
            <AsciiPortrait compact />
          </div>
        </div>

        {/* Text column */}
        <div className="lg:col-span-7 flex flex-col items-start gap-8 md:gap-10 text-left">
          <div className="flex flex-col gap-3 md:gap-0">
            <h1
              className="group text-[2.75rem] md:text-7xl lg:text-[7rem] text-text-primary antialiased tracking-[-0.06em] leading-[0.85] md:leading-[0.9] animate-fade-up cursor-default"
              style={{ animationDelay: "100ms" }}
            >
              {NAME.split("").map((char, i) =>
                char === " " ? (
                  <span key={i}>&nbsp;</span>
                ) : (
                  <span
                    key={i}
                    className="transition-colors duration-normal group-hover:text-accent"
                    style={{ transitionDelay: `${i * 25}ms` }}
                  >
                    {char}
                  </span>
                ),
              )}
            </h1>

            <p
              className="uppercase text-[10px] md:text-sm tracking-[0.15em] text-text-tertiary font-(--font-body) animate-fade-up"
              style={{ animationDelay: "200ms" }}
            >
              software engineer | problem solver | tech enthusiast
            </p>

            <p
              className="text-base md:text-lg text-text-secondary max-w-2xl leading-[1.7] md:leading-[1.8] pt-2 md:py-4 text-left animate-fade-up"
              style={{ animationDelay: "300ms" }}
            >
              design software for humans, architect solutions for resilience. security must be part of the mvp.{" "}
              <a
                href="https://peps.python.org/pep-0020/#the-zen-of-python"
                target="_blank"
                rel="noopener noreferrer"
                className="text-text-primary underline decoration-accent/40 underline-offset-4 decoration-1 transition-colors duration-normal hover:text-accent hover:decoration-accent"
              >
                simple is better than complex, complex is better than complicated.
              </a>
            </p>
          </div>

          <Projects />
          <GetInTouch />
        </div>

        {/* ASCII portrait — desktop only */}
        <div className="hidden lg:flex lg:col-span-5 justify-end animate-fade-up" style={{ animationDelay: "200ms" }}>
          <AsciiPortrait />
        </div>
      </div>
    </section>
  );
}
