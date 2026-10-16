import type { RoutableProps } from "preact-router";
import { getAllPosts } from "@/data/posts";
import { useHead } from "@/hooks/useHead";
import { PostIndex } from "./PostIndex";

export function BlogListPage(_props: RoutableProps) {
  const posts = getAllPosts();

  useHead({
    title: "writing | felix hernandez vieyra",
    description: "thoughts on software engineering, web development, and technology.",
    url: "https://felix-hzv.dev/blog",
    image: "https://felix-hzv.dev/og/home.png",
  });

  return (
    <section aria-labelledby="writing-title" className="page-grid pt-8 md:pt-16 pb-chapter">
      <div className="col-margin mb-4 md:mb-0 md:pt-[1.2vw]">
        <span className="font-pixel text-accent text-small">03</span>
        <p className="meta mt-1">
          contents · {posts.length} {posts.length === 1 ? "entry" : "entries"}
        </p>
      </div>
      <div className="col-main">
        <h1 id="writing-title" className="display text-title">
          writing
        </h1>
        <p className="text-lead text-ink-2 mt-4 md:mt-6 max-w-[30em]">
          writing about software, architecture &amp; the things I learn
        </p>
        <div className="mt-10 md:mt-14">
          {posts.length === 0 ? (
            <p className="meta border-t border-ink pt-5">
              <span className="text-accent">$</span> ls ./posts
              <br />
              (empty)
            </p>
          ) : (
            <PostIndex posts={posts} />
          )}
        </div>
      </div>
    </section>
  );
}
