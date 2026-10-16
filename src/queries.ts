import { defineQuery } from "groq";

// Published posts only; typegen reads this file to generate the result types
export const POSTS_QUERY =
  defineQuery(`*[_type == "post" && !(_id in path("drafts.**")) && defined(slug.current) && defined(publishedAt) && defined(excerpt)] | order(publishedAt desc) {
  _id,
  title,
  "slug": slug.current,
  excerpt,
  body,
  tags,
  publishedAt,
  "coverImage": mainImage.asset->url,
  coverImageCredit
}`);

// Dev-only, run with the drafts perspective: drafts overlay their published version,
// and _originalId tells the two apart. Drafts may be missing fields, hence the fallbacks.
export const PREVIEW_POSTS_QUERY =
  defineQuery(`*[_type == "post" && defined(slug.current)] | order(coalesce(publishedAt, _createdAt) desc) {
  _id,
  _originalId,
  "title": coalesce(title, "untitled"),
  "slug": slug.current,
  "excerpt": coalesce(excerpt, ""),
  body,
  tags,
  "publishedAt": coalesce(publishedAt, _createdAt),
  "coverImage": mainImage.asset->url,
  coverImageCredit
}`);

export const PUBLISHED_POST_IDS_QUERY = defineQuery(`*[_type == "post" && !(_id in path("drafts.**"))]._id`);
