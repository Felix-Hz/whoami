import { AsciiPortrait } from "./AsciiPortrait";
import { GetInTouch } from "./GetInTouch";

const NAME = "felix hernandez vieyra";

export function HeroSection() {
  return (
    <section className="flex-1 flex items-center px-6 md:px-8 lg:px-16 pt-20 md:pt-24 lg:pt-32 pb-8 md:pb-12 lg:pb-20">
      {/* Mobile: centered stack / Desktop: editorial grid */}
      <div className="w-full max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
        {/* Text column */}
        <div className="lg:col-span-7 flex flex-col items-start gap-4 text-left">
          <h1
            className="group text-5xl md:text-7xl lg:text-[7rem] text-text-primary antialiased tracking-[-0.06em] leading-[0.9] animate-fade-up cursor-default"
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
            className="uppercase text-xs md:text-sm tracking-[0.15em] text-text-tertiary font-[var(--font-body)] hidden md:block animate-fade-up"
            style={{ animationDelay: "200ms" }}
          >
            software engineer | web-application developer | tech enthusiast
          </p>

          <p
            className="text-base md:text-lg text-text-secondary max-w-2xl leading-[1.7] md:leading-[1.8] py-0 md:py-4 text-left animate-fade-up"
            style={{ animationDelay: "300ms" }}
          >
            passionate about building software that solves users' problems. love the bleeding-edge, firm believer in
            perpetual learning. design software for humans. architect solutions for resilience. security must be part of
            the mvp. simple is better than complex. complex is better than complicated. actions transmit values better
            than words.
          </p>

          <GetInTouch />
        </div>

        {/* ASCII portrait column */}
        <div className="hidden lg:flex lg:col-span-5 justify-end animate-fade-up" style={{ animationDelay: "200ms" }}>
          <AsciiPortrait />
        </div>
      </div>
    </section>
  );
}
