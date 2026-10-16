import { EMAIL } from "@/components/layout/links";
import { trackSocialClick } from "@/utils/analytics";

// The closing letter: the last thing on the home page, and the only call to action on it
export function GetInTouch() {
  return (
    <section aria-label="get in touch" className="page-grid chapter-rule pt-chapter pb-12 md:pb-16">
      <p className="col-main display text-section">
        if any of this was useful, or wrong, write to{" "}
        <a
          href={`mailto:${EMAIL}`}
          onClick={() => trackSocialClick("email")}
          className="text-accent underline decoration-1 underline-offset-[0.14em] hover:decoration-2 whitespace-nowrap"
        >
          {EMAIL}
        </a>
        .
      </p>
    </section>
  );
}
