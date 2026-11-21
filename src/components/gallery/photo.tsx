import { route } from "preact-router";
import type { Photo } from "@/data/photos";

// Files are uploaded by scripts/photos.py as img/{imageId}/{longEdge}.avif, plus one JPEG for browsers
// without AVIF. The longest published edge is 2048 px.
const FALLBACK_EDGE = 1600;

const longest = (p: Photo) => Math.max(...p.edges);

export function aspect(p: Photo): number {
  return p.width / p.height;
}

// width and height are those of the largest file; every smaller file is the same image scaled by edge / longest
function srcset(p: Photo): string {
  const top = longest(p);
  return p.edges.map((edge) => `/img/${p.imageId}/${edge}.avif ${Math.round((p.width * edge) / top)}w`).join(", ");
}

export function fallbackSrc(p: Photo): string {
  return `/img/${p.imageId}/${Math.min(FALLBACK_EDGE, longest(p))}.jpg`;
}

// The no-break space keeps the @ on the same line as the place
export const place = (p: Photo) => `@\u00a0${p.location || "unknown"}`;

// Plate numbers count from 01, like a printed book's
export const plate = (n: number) => String(n + 1).padStart(2, "0");

export const transitionName = (p: Photo) => `photo-${p.imageId}`;

export function Picture({
  photo,
  sizes,
  eager = false,
  named = false,
}: {
  photo: Photo;
  sizes: string;
  eager?: boolean;
  // A view-transition-name must be unique on the page, so only the image being morphed carries one
  named?: boolean;
}) {
  return (
    <picture>
      <source type="image/avif" srcSet={srcset(photo)} sizes={sizes} />
      <img
        src={fallbackSrc(photo)}
        className="photo-img"
        alt={photo.title}
        width={photo.width}
        height={photo.height}
        loading={eager ? "eager" : "lazy"}
        decoding="async"
        fetchpriority={eager ? "high" : undefined}
        draggable={false}
        style={named ? { viewTransitionName: transitionName(photo) } : undefined}
      />
    </picture>
  );
}

// Warms the cache for a neighbouring photo with the same candidate the browser would pick on screen
export function preload(photo: Photo, sizes: string): void {
  const img = new Image();
  img.sizes = sizes;
  img.srcset = srcset(photo);
}

// Suppresses the browser's save menu on photographs only; it deters casual copying, nothing more
export function guardImages(e: MouseEvent): void {
  if ((e.target as HTMLElement | null)?.tagName === "IMG") e.preventDefault();
}

const reducedMotion = () => typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;

// Routes inside a View Transition where the browser has one. The router listens on window, so stopping
// the click here keeps it from routing outside the transition. A plain route otherwise.
export function navigate(href: string, e?: Event): void {
  if (e && (e as MouseEvent).button) return;
  if (
    e &&
    ((e as MouseEvent).metaKey || (e as MouseEvent).ctrlKey || (e as MouseEvent).shiftKey || (e as MouseEvent).altKey)
  )
    return;
  e?.preventDefault();
  e?.stopPropagation();
  if (!document.startViewTransition || reducedMotion()) {
    route(href);
    return;
  }
  document.startViewTransition(async () => {
    route(href);
    // Preact commits the routed tree in a microtask; a macrotask boundary means the DOM is final
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}
