import { defineQuery } from "groq";

// Published posts only; typegen reads this file to generate PostsQueryResult
export const POSTS_QUERY =
  defineQuery(`*[_type == "post" && !(_id in path("drafts.**")) && defined(slug.current) && defined(publishedAt) && defined(excerpt)] | order(publishedAt desc) {
  title,
  "slug": slug.current,
  excerpt,
  body,
  tags,
  publishedAt,
  "coverImage": mainImage.asset->url,
  coverImageCredit
}`);
