import { PortableText } from "@portabletext/react";
import { useMemo } from "preact/hooks";
import type { RoutableProps } from "preact-router";
import { authoringSlot } from "@/authoring-slot";
import { getPostBySlug } from "@/data/posts";
import { useHead } from "@/hooks/useHead";
import { trackBlogPostView } from "@/utils/analytics";
import { isoDate } from "./BlogPostCard";
import { createPortableTextComponents, Marks } from "./PortableTextComponents";
import { ShareLinks } from "./ShareLinks";

interface BlogPostPageProps extends RoutableProps {
  slug?: string;
}

function BackLink() {
  return (
    <a href="/blog" className="font-mono text-meta text-ink-2 hover:text-accent">
      <span aria-hidden="true">← </span>contents
    </a>
  );
}

export function BlogPostPage({ slug }: BlogPostPageProps) {
  const post = slug ? getPostBySlug(slug) : undefined;
  // Stable renderers: new component functions on every render would remount the whole body
  const components = useMemo(() => createPortableTextComponents(post?.body ?? []), [post]);

  useHead({
    title: post ? `${post.title} | felix hernandez vieyra` : "post not found",
    description: post?.excerpt || "blog post",
    url: `https://felix-hzv.dev/blog/${slug || ""}`,
    // Generated at build time by scripts/og.ts
    image: post ? `https://felix-hzv.dev/og/${post.slug}.png` : undefined,
    type: post ? "article" : "website",
    publishedTime: post?.publishedAt,
  });

  if (!post) {
    return (
      <section className="page-grid pt-8 md:pt-16 pb-chapter">
        <div className="col-margin meta mb-4 md:mb-0">404</div>
        <div className="col-main">
          <h1 className="display text-title">post not found</h1>
          <p className="text-lead text-ink-2 mt-4">the post you're looking for doesn't exist.</p>
          <p className="mt-8">
            <BackLink />
          </p>
        </div>
      </section>
    );
  }

  const postUrl = `https://felix-hzv.dev/blog/${post.slug}`;
  trackBlogPostView(post.slug, post.title);

  return (
    <article>
      {/* The only motion on a reading page: a hairline that tracks how far through the post you are */}
      <div className="read-progress" aria-hidden="true" />
      <header className="page-grid pt-8 md:pt-14">
        <div className="col-margin meta order-2 md:order-none mt-6 md:mt-0 md:pt-[1vw] flex flex-wrap md:flex-col gap-x-5 gap-y-0">
          <p>
            <time dateTime={post.publishedAt}>{isoDate(post.publishedAt)}</time>
          </p>
          <p>{post.readingTime} min</p>
          {authoringSlot.Badge && <authoringSlot.Badge post={post} />}
          {post.tags.length > 0 && (
            <ul className="w-full md:mt-4">
              <li className="sr-only">tags</li>
              {post.tags.map((tag) => (
                <li
                  key={tag}
                  className="inline md:block after:content-['_·_'] last:after:content-none md:after:content-none"
                >
                  {tag}
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="col-main lg:col-end-12">
          <h1 className="display text-title">{post.title}</h1>
          {post.excerpt && <p className="text-lead text-ink-2 mt-5 md:mt-6 max-w-[30em]">{post.excerpt}</p>}
        </div>
        {post.coverImage && (
          <figure className="col-wide order-3 md:order-none mt-8 md:mt-12">
            <div className="plate aspect-[16/9] md:aspect-[16/7]">
              <img
                src={`${post.coverImage}?w=1200&fit=max&auto=format&q=45`}
                srcSet={[480, 768, 1200, 1600, 2000]
                  .map((w) => `${post.coverImage}?w=${w}&fit=max&auto=format&q=45 ${w}w`)
                  .join(", ")}
                sizes="(min-width: 1024px) 75vw, (min-width: 768px) 75vw, 100vw"
                alt=""
                width={1600}
                height={700}
                loading="eager"
                // The cover is usually the largest paint on a post; let it win over the font preloads. Printed in one ink,
                // so a lower quality setting costs nothing visible and halves the bytes
                fetchpriority="high"
              />
            </div>
            {post.coverImageCredit && <figcaption className="meta mt-2">{post.coverImageCredit}</figcaption>}
          </figure>
        )}
      </header>

      <div className="post-body prose page-grid pt-10 md:pt-14">
        <PortableText value={post.body} components={components} />
      </div>

      <footer className="page-grid pt-12 pb-chapter">
        <div className="col-text flex flex-col gap-10">
          <Marks />
          <ShareLinks title={post.title} slug={post.slug} url={postUrl} />
          <p>
            <BackLink />
          </p>
        </div>
      </footer>
    </article>
  );
}
