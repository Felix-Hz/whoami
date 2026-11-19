import { useEffect } from "preact/hooks";
import type { RoutableProps } from "preact-router";
import { getAllPhotos, type Photo } from "@/data/photos";
import { useHead } from "@/hooks/useHead";
import { aspect, fallbackSrc, guardImages, navigate, Picture, place } from "./photo";

export const RETURN_KEY = "gallery:return";

type Kind = "full" | "pair" | "inset-left" | "inset-right";

// The page rhythm: a plate across the measure, a pair, an inset, a pair, the other inset, a pair.
// Pairs share one height (each item grows by its aspect ratio), so they sit on a common baseline.
const CYCLE: Kind[] = ["full", "pair", "inset-right", "pair", "inset-left", "pair"];

export function spreads(photos: Photo[]): { kind: Kind; photos: Photo[]; start: number }[] {
  const out: { kind: Kind; photos: Photo[]; start: number }[] = [];
  let i = 0;
  let step = 0;
  while (i < photos.length) {
    let kind = CYCLE[step++ % CYCLE.length];
    if (kind === "pair" && i + 1 >= photos.length) kind = "inset-right";
    // A portrait across the full measure would be taller than the screen
    if (kind === "full" && aspect(photos[i]) < 1.2) kind = "inset-left";
    const n = kind === "pair" ? 2 : 1;
    out.push({ kind, photos: photos.slice(i, i + n), start: i });
    i += n;
  }
  return out;
}

// What each spread occupies on a 1440px desktop, a tablet and a phone; picks the srcset candidate
const SIZES: Record<Kind, string> = {
  full: "(min-width: 96rem) 92rem, 96vw",
  pair: "(min-width: 48rem) 48vw, 96vw",
  "inset-left": "(min-width: 64rem) 64vw, 96vw",
  "inset-right": "(min-width: 64rem) 64vw, 96vw",
};

const plate = (n: number) => String(n + 1).padStart(2, "0");

function Item({ photo, n, sizes, eager }: { photo: Photo; n: number; sizes: string; eager: boolean }) {
  const href = `/gallery/${photo.slug}`;
  return (
    <figure id={`p-${photo.slug}`} className="gallery-item reveal" style={{ "--aspect": aspect(photo) }}>
      <a
        href={href}
        onClick={(e) => navigate(href, e)}
        className="photo-frame block"
        style={{ backgroundColor: photo.color }}
        aria-label={`${photo.title}, ${photo.location || "location unknown"}`}
      >
        <Picture photo={photo} sizes={sizes} eager={eager} named />
      </a>
      <figcaption className="mt-3 flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
        <span className="font-pixel text-accent text-meta">{plate(n)}</span>
        <span className="text-small text-ink">{photo.title}</span>
        <span className="meta">{place(photo)}</span>
      </figcaption>
    </figure>
  );
}

export function GalleryPage(_props: RoutableProps) {
  const photos = getAllPhotos();

  useHead({
    title: "gallery | felix hernandez vieyra",
    description: "photographs by felix hernandez vieyra.",
    url: "https://felix-hzv.dev/gallery",
    image: photos[0] ? `https://felix-hzv.dev${fallbackSrc(photos[0])}` : "https://felix-hzv.dev/og/home.png",
  });

  // Coming back from a photo lands on that photo, not the top of the page. The app scrolls to the top on
  // every route change, so this waits a frame to run after it.
  useEffect(() => {
    let slug: string | null = null;
    try {
      slug = sessionStorage.getItem(RETURN_KEY);
      sessionStorage.removeItem(RETURN_KEY);
    } catch {
      return;
    }
    if (!slug) return;
    const id = requestAnimationFrame(() => document.getElementById(`p-${slug}`)?.scrollIntoView({ block: "center" }));
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <>
      <section aria-labelledby="gallery-title" className="page-grid pt-8 md:pt-16">
        <div className="col-margin mb-4 md:mb-0 md:pt-[1.2vw]">
          <span className="font-pixel text-accent text-small">04</span>
          <p className="meta mt-1">
            plates · {photos.length} {photos.length === 1 ? "photograph" : "photographs"}
          </p>
        </div>
        <div className="col-main">
          <h1 id="gallery-title" className="display text-title">
            gallery
          </h1>
          <p className="text-lead text-ink-2 mt-4 md:mt-6 max-w-[30em]">photographs, by felix hernandez vieyra</p>
        </div>
      </section>

      {photos.length === 0 ? (
        <div className="page-grid pt-10 pb-chapter">
          <p className="col-main meta border-t border-ink pt-5">
            <span className="text-accent">$</span> ls ./gallery
            <br />
            (empty)
          </p>
        </div>
      ) : (
        // biome-ignore lint/a11y/noStaticElementInteractions: blocks the image context menu only; no action of its own
        <div className="gallery page-grid pt-10 md:pt-16 pb-chapter" onContextMenu={guardImages}>
          {spreads(photos).map(({ kind, photos: group, start }) => (
            <div key={group[0].imageId} className={`spread spread-${kind}`}>
              {group.map((photo, j) => (
                <Item key={photo.imageId} photo={photo} n={start + j} sizes={SIZES[kind]} eager={start === 0} />
              ))}
            </div>
          ))}
        </div>
      )}
    </>
  );
}
