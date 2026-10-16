import { trackSocialClick } from "@/utils/analytics";
import { OUTBOUND } from "./links";

export function Footer() {
  return (
    <footer className="page-grid chapter-rule py-10 md:py-12 meta">
      <p className="col-span-full md:col-span-4 lg:col-span-6">
        developed by yours truly, with much 🧉 &copy; {new Date().getFullYear()}
      </p>
      <nav
        aria-label="Elsewhere"
        className="col-span-full md:col-span-4 lg:col-span-6 flex gap-6 mt-3 md:mt-0 md:justify-end"
      >
        {OUTBOUND.map((o) => (
          <a
            key={o.href}
            href={o.href}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => trackSocialClick(o.track)}
            className="hover:text-accent"
          >
            {o.label}
            <span aria-hidden="true"> ↗</span>
          </a>
        ))}
        <a href="/rss.xml" className="hover:text-accent">
          rss
        </a>
      </nav>
    </footer>
  );
}
