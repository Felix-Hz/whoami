import type { PHOTOS_QUERY_RESULT } from "@/generated/sanity.types";

export type Photo = PHOTOS_QUERY_RESULT[number];

let photos: Photo[] = [];

try {
  photos = (await import("@/generated/photos.json")).default as Photo[];
} catch {
  // No generated content yet: empty gallery
}

export function getAllPhotos(): Photo[] {
  return photos;
}

export function getPhotoIndex(slug: string): number {
  return photos.findIndex((p) => p.slug === slug);
}
