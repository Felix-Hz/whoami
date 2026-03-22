import { trackSocialClick } from "@/utils/track-social-interaction";

export function GetInTouch() {
  return (
    <div className="animate-fade-up flex flex-col gap-3" style={{ animationDelay: "400ms" }}>
      <span className="uppercase text-xs tracking-[0.15em] text-text-tertiary">get in touch</span>
      <a
        href="mailto:me@felix-hzv.dev"
        onClick={() => trackSocialClick("email")}
        className="group inline-flex items-baseline flex-wrap font-[var(--font-mono)] text-base md:text-lg text-text-primary py-2 transition-colors duration-normal focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
      >
        <span className="text-accent font-bold group-hover:text-accent">$</span>
        <span className="ml-1.5 group-hover:text-accent transition-colors duration-normal">mailto</span>
        <span className="ml-2 underline-offset-4 group-hover:underline">me@felix-hzv.dev</span>
        <span className="inline-block ml-2 transition-transform duration-normal group-hover:translate-x-1">&rarr;</span>
      </a>
    </div>
  );
}
