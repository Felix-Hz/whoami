import type { PortableTextComponents } from "@portabletext/react";
import type { PostBodyBlock } from "@/types/blog";

// The site's one ornament: small cobalt squares, used for breaks and the end mark
export function Marks({ className = "" }: { className?: string }) {
  return (
    <div className={`marks ${className}`} aria-hidden="true">
      <i />
      <i />
      <i />
    </div>
  );
}

export function createPortableTextComponents(body: PostBodyBlock[]): PortableTextComponents {
  // Decided from the data, not a render-time flag, so re-renders keep the drop cap in place
  const firstParagraphKey = body.find((block) => block._type === "block" && block.style === "normal")?._key;

  return {
    block: {
      h2: ({ children }) => <h2>{children}</h2>,
      h3: ({ children }) => <h3>{children}</h3>,
      h4: ({ children }) => <h4>{children}</h4>,
      normal: ({ children, value }) => (
        <p className={value._key === firstParagraphKey ? "drop-cap" : undefined}>{children}</p>
      ),
      blockquote: ({ children }) => (
        <blockquote>
          <p>{children}</p>
        </blockquote>
      ),
    },
    marks: {
      strong: ({ children }) => <strong>{children}</strong>,
      em: ({ children }) => <em>{children}</em>,
      code: ({ children }) => <code>{children}</code>,
      link: ({ value, children }) => {
        const external = value?.href?.startsWith("http");
        return (
          <a
            href={value?.href}
            target={external ? "_blank" : undefined}
            rel={external ? "noopener noreferrer" : undefined}
          >
            {children}
          </a>
        );
      },
    },
    types: {
      // Body images stay in natural colour: they're often screenshots and must stay legible
      image: ({ value }) => (
        <figure className="figure">
          <img
            src={`${value.asset?.url || value.asset?._ref}?w=1200&fit=max&auto=format`}
            alt={value.alt || ""}
            loading="lazy"
            decoding="async"
            className="w-full h-auto"
          />
          {value.caption && <figcaption className="meta mt-2">{value.caption}</figcaption>}
        </figure>
      ),
      code: ({ value }) => {
        const lines = (value.code ?? "").replace(/\n+$/, "").split("\n").length;
        return (
          <figure className="code-block">
            <figcaption className="meta flex justify-between gap-4 px-5 md:px-6 pt-3">
              <span>{value.language || "text"}</span>
              <span>
                {lines} {lines === 1 ? "line" : "lines"}
              </span>
            </figcaption>
            {/* biome-ignore lint/a11y/noNoninteractiveTabindex: wide code scrolls sideways; keyboard users need to focus it to scroll */}
            <pre className="overflow-x-auto px-5 md:px-6 pt-3 pb-5 font-mono text-code text-ink" tabIndex={0}>
              {value.html ? <code dangerouslySetInnerHTML={{ __html: value.html }} /> : <code>{value.code}</code>}
            </pre>
          </figure>
        );
      },
      break: () => <Marks className="justify-center py-4" />,
    },
    list: {
      bullet: ({ children }) => <ul>{children}</ul>,
      number: ({ children }) => <ol>{children}</ol>,
    },
    listItem: {
      bullet: ({ children }) => <li>{children}</li>,
      number: ({ children }) => <li>{children}</li>,
    },
  };
}
