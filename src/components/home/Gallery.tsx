import { aspect, guardImages, navigate, Picture, place, plate } from "@/components/gallery/photo";
import { getAllPhotos } from "@/data/photos";
import { Chapter } from "./Chapter";

// The main column's width at each breakpoint; picks the srcset candidate
const SIZES = "(min-width: 96rem) 54rem, (min-width: 64rem) 58vw, (min-width: 48rem) 72vw, 92vw";

// The gallery's lead plate, with the count of what follows it there
export function Gallery() {
  const photos = getAllPhotos();
  const lead = photos[0];
  if (!lead) return null;
  const href = `/gallery/${lead.slug}`;
  const rest = photos.length - 1;

  return (
    <Chapter id="gallery" n="04" title="gallery" note={`${photos.length} photographs`}>
      {/* biome-ignore lint/a11y/noStaticElementInteractions: blocks the image context menu only; no action of its own */}
      <div className="border-t border-rule pt-5 md:pt-6" onContextMenu={guardImages}>
        <figure className="gallery-item" style={{ "--aspect": aspect(lead) }}>
          <a
            href={href}
            onClick={(e) => navigate(href, e)}
            className="photo-frame block"
            style={{ backgroundColor: lead.color }}
            aria-label={`${lead.title}, ${lead.location || "location unknown"}`}
          >
            <Picture photo={lead} sizes={SIZES} named />
          </a>
          <figcaption className="mt-3 flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
            <span className="font-sans font-medium text-small text-ink">{lead.title}</span>
            <span className="meta">{place(lead)}</span>
            <span className="label ml-auto">
              {plate(0)} / {plate(photos.length - 1)}
            </span>
          </figcaption>
        </figure>
      </div>
      {rest > 0 && (
        <a
          href="/gallery"
          className="inline-block mt-6 font-mono text-label font-medium uppercase tracking-[0.04em] text-ink underline decoration-accent hover:text-accent"
        >
          {rest} more in the gallery →
        </a>
      )}
    </Chapter>
  );
}
