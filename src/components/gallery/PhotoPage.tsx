import { useEffect, useRef } from "preact/hooks";
import type { RoutableProps } from "preact-router";
import { getAllPhotos, getPhotoIndex, type Photo } from "@/data/photos";
import { useHead } from "@/hooks/useHead";
import { RETURN_KEY } from "./GalleryPage";
import { aspect, fallbackSrc, guardImages, navigate, Picture, place, preload } from "./photo";

interface PhotoPageProps extends RoutableProps {
  slug?: string;
}

// The stage is bounded by the viewport height as well as its width (see .photo-stage)
const STAGE_SIZES = "(min-width: 64rem) 88vw, 100vw";
const SWIPE_PX = 50;

const plate = (n: number) => String(n + 1).padStart(2, "0");

function keyHandler(onPrev: () => void, onNext: () => void) {
  return (e: KeyboardEvent) => {
    if (e.metaKey || e.ctrlKey || e.altKey || e.defaultPrevented) return;
    // While the inspect view is open, Escape closes it (the dialog's own cancel) and nothing navigates
    if (document.querySelector("dialog[open]")) return;
    const t = e.target as HTMLElement | null;
    if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
    if (e.key === "ArrowLeft") onPrev();
    else if (e.key === "ArrowRight") onNext();
    else if (e.key === "Escape") navigate("/gallery");
  };
}

// Horizontal swipes on the image step through the set; vertical movement stays a scroll
function swipeHandlers(onPrev: () => void, onNext: () => void) {
  let x0: number | null = null;
  let y0 = 0;
  return {
    down(e: PointerEvent) {
      if (e.pointerType === "mouse") return;
      x0 = e.clientX;
      y0 = e.clientY;
    },
    up(e: PointerEvent) {
      if (x0 === null) return;
      const dx = e.clientX - x0;
      const dy = e.clientY - y0;
      x0 = null;
      if (Math.abs(dx) < SWIPE_PX || Math.abs(dx) < Math.abs(dy) * 1.5) return;
      if (dx > 0) onPrev();
      else onNext();
    },
  };
}

function Detail({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="contents">
      <dt className="text-ink-3">{label}</dt>
      <dd className="text-ink-2">{value}</dd>
    </div>
  );
}

// The only prev/next links on the page, beside the image; the arrow keys and swipes do the same.
function StageArrow({ photo, dir }: { photo?: Photo; dir: "prev" | "next" }) {
  const glyph = dir === "prev" ? "←" : "→";
  if (!photo) {
    // Holds the column on desktop so the image stays centred at either end of the set
    return (
      <span className="stage-arrow" data-dir={dir} data-empty="" aria-hidden="true">
        {glyph}
      </span>
    );
  }
  const href = `/gallery/${photo.slug}`;
  return (
    <a href={href} onClick={(e) => navigate(href, e)} className="stage-arrow" data-dir={dir} rel={dir}>
      <span aria-hidden="true">{glyph}</span>
      <span className="sr-only">
        {dir === "prev" ? "previous" : "next"}: {photo.title}
      </span>
    </a>
  );
}

export function PhotoPage({ slug }: PhotoPageProps) {
  const photos = getAllPhotos();
  const index = slug ? getPhotoIndex(slug) : -1;
  const photo = index >= 0 ? photos[index] : undefined;
  const prev = index > 0 ? photos[index - 1] : undefined;
  const next = index >= 0 ? photos[index + 1] : undefined;
  const stage = useRef<HTMLDivElement>(null);
  const inspect = useRef<HTMLDialogElement>(null);

  useHead({
    title: photo ? `${photo.title} | felix hernandez vieyra` : "photo not found",
    description: photo
      ? `${[photo.title, photo.location].filter(Boolean).join(", ")}. photograph by ${photo.author}.`
      : "photograph",
    url: `https://felix-hzv.dev/gallery/${slug || ""}`,
    image: photo ? `https://felix-hzv.dev${fallbackSrc(photo)}` : undefined,
  });

  useEffect(() => {
    if (!photo) return;
    try {
      sessionStorage.setItem(RETURN_KEY, photo.slug);
    } catch {
      // Storage blocked: returning to the gallery starts at the top
    }
    if (prev) preload(prev, STAGE_SIZES);
    if (next) preload(next, STAGE_SIZES);

    const go = (to?: Photo) => to && navigate(`/gallery/${to.slug}`);
    const onKey = keyHandler(
      () => go(prev),
      () => go(next),
    );
    const swipe = swipeHandlers(
      () => go(prev),
      () => go(next),
    );

    const el = stage.current;
    addEventListener("keydown", onKey);
    el?.addEventListener("pointerdown", swipe.down);
    el?.addEventListener("pointerup", swipe.up);
    return () => {
      removeEventListener("keydown", onKey);
      el?.removeEventListener("pointerdown", swipe.down);
      el?.removeEventListener("pointerup", swipe.up);
    };
  }, [photo, prev, next]);

  if (!photo) {
    return (
      <section className="page-grid pt-8 md:pt-16 pb-chapter">
        <div className="col-margin meta mb-4 md:mb-0">404</div>
        <div className="col-main">
          <h1 className="display text-title">photo not found</h1>
          <p className="mt-8">
            <a href="/gallery" className="font-mono text-meta text-ink-2 hover:text-accent">
              <span aria-hidden="true">← </span>gallery
            </a>
          </p>
        </div>
      </section>
    );
  }

  return (
    <article>
      {/* biome-ignore lint/a11y/noStaticElementInteractions: blocks the image context menu only; no action of its own */}
      <div ref={stage} className="photo-stage px-gutter pt-2 md:pt-4" onContextMenu={guardImages}>
        <StageArrow photo={prev} dir="prev" />
        <div className="photo-frame" style={{ "--aspect": aspect(photo), backgroundColor: photo.color }}>
          <button type="button" className="photo-inspect-open" onClick={() => inspect.current?.showModal()}>
            <Picture photo={photo} sizes={STAGE_SIZES} eager named />
            <span className="sr-only">inspect {photo.title}</span>
          </button>
        </div>
        <StageArrow photo={next} dir="next" />
      </div>

      {/* The photo alone over the blurred page. Any click or tap closes it, as does Escape. The image is
          lazy, so the full-width file is fetched only when the view first opens. */}
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: Escape closes a modal dialog natively */}
      <dialog
        ref={inspect}
        className="photo-inspect"
        aria-label={photo.title}
        onClick={() => inspect.current?.close()}
        onContextMenu={guardImages}
      >
        <Picture photo={photo} sizes="100vw" />
      </dialog>

      <header className="page-grid pt-6 md:pt-8 pb-chapter">
        <nav
          aria-label="Photographs"
          className="col-margin meta order-2 md:order-none mt-8 md:mt-0 flex flex-col gap-3 md:pt-[0.6vw]"
        >
          <p>
            <span className="font-pixel text-accent">{plate(index)}</span>
            <span className="text-ink-3"> / {plate(photos.length - 1)}</span>
          </p>
          <p>
            <a href="/gallery" onClick={(e) => navigate("/gallery", e)} className="text-ink-2 hover:text-accent">
              <span aria-hidden="true">← </span>gallery
            </a>
          </p>
        </nav>
        <div className="col-main">
          <h1 className="display text-section">{photo.title}</h1>
          <p className="text-lead text-ink-2 mt-3">{place(photo)}</p>
          <dl className="meta mt-6 grid grid-cols-[auto_minmax(0,1fr)] gap-x-6 gap-y-1">
            <Detail label="author" value={photo.author} />
            <Detail label="camera" value={photo.camera} />
            <Detail label="lens" value={photo.lens} />
            <Detail label="exposure" value={photo.exposure} />
          </dl>
        </div>
      </header>
    </article>
  );
}
