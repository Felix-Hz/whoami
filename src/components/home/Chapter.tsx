import type { ComponentChildren } from "preact";

interface ChapterProps {
  id: string;
  n: string;
  title: string;
  note?: ComponentChildren;
  children: ComponentChildren;
}

// One numbered chapter of the home page: the number and a note sit in the margin, the content in the main column
export function Chapter({ id, n, title, note, children }: ChapterProps) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="page-grid chapter-rule py-chapter scroll-mt-24">
      <div className="col-margin mb-4 md:mb-0">
        <span className="font-pixel text-accent text-small">{n}</span>
        {note && <p className="meta mt-1 max-w-[24ch]">{note}</p>}
      </div>
      <div className="col-main">
        <h2 id={`${id}-title`} className="reveal display text-section mb-6 md:mb-7">
          {title}
        </h2>
        <div className="reveal-items">{children}</div>
      </div>
    </section>
  );
}
