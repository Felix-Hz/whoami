import type { PortableTextComponents } from "@portabletext/react";

export function createPortableTextComponents(): PortableTextComponents {
  let firstParagraphRendered = false;

  return {
    block: {
      h2: ({ children }) => (
        <>
          <div className="section-divider my-10" aria-hidden="true">
            <span>&bull;</span>
            <span>&bull;</span>
            <span>&bull;</span>
          </div>
          <h2 className="font-[var(--font-heading)] text-2xl md:text-3xl text-text-primary mb-4">{children}</h2>
        </>
      ),
      h3: ({ children }) => (
        <h3 className="font-[var(--font-heading)] text-xl md:text-2xl text-text-primary mt-8 mb-3">{children}</h3>
      ),
      h4: ({ children }) => (
        <h4 className="font-[var(--font-heading)] text-lg md:text-xl text-text-primary mt-6 mb-2">{children}</h4>
      ),
      normal: ({ children }) => {
        if (!firstParagraphRendered) {
          firstParagraphRendered = true;
          return <p className="drop-cap text-text-secondary leading-relaxed mb-5">{children}</p>;
        }
        return <p className="text-text-secondary leading-relaxed mb-5">{children}</p>;
      },
      blockquote: ({ children }) => <blockquote className="editorial-blockquote">{children}</blockquote>,
    },
    marks: {
      strong: ({ children }) => <strong className="text-text-primary font-semibold">{children}</strong>,
      em: ({ children }) => <em>{children}</em>,
      code: ({ children }) => (
        <code className="font-[var(--font-mono)] text-sm bg-surface-inverse/5 text-text-primary px-1.5 py-0.5 rounded">
          {children}
        </code>
      ),
      link: ({ value, children }) => (
        <a
          href={value?.href}
          target={value?.href?.startsWith("http") ? "_blank" : undefined}
          rel={value?.href?.startsWith("http") ? "noopener noreferrer" : undefined}
          className="text-accent hover:text-accent-hover underline underline-offset-4 transition-colors duration-normal"
        >
          {children}
        </a>
      ),
    },
    types: {
      image: ({ value }) => (
        <figure className="my-8">
          <img
            src={`${value.asset?.url || value.asset?._ref}?w=800&fit=max&auto=format`}
            alt={value.alt || ""}
            loading="lazy"
            className="w-full aspect-[21/9] object-cover rounded-sm"
          />
          {value.caption && (
            <figcaption className="mt-3 text-sm text-text-tertiary text-center italic">
              &mdash; {value.caption}
            </figcaption>
          )}
        </figure>
      ),
      code: ({ value }) => (
        <div className="my-6">
          {value.language && (
            <div className="bg-surface-inverse text-text-inverse/50 px-5 pt-3 pb-0 rounded-t-sm">
              <span className="font-[var(--font-mono)] text-xs uppercase tracking-wider">{value.language}</span>
            </div>
          )}
          <pre
            className={`bg-surface-inverse text-text-inverse p-5 ${value.language ? "rounded-b-sm" : "rounded-sm"} overflow-x-auto text-sm leading-relaxed`}
          >
            <code className="font-[var(--font-mono)]">{value.code}</code>
          </pre>
        </div>
      ),
      break: () => (
        <div className="section-divider my-10" aria-hidden="true">
          <span>&#10022;</span>
        </div>
      ),
    },
    list: {
      bullet: ({ children }) => <ul className="editorial-list mb-5 space-y-1.5 text-text-secondary">{children}</ul>,
      number: ({ children }) => <ol className="list-decimal pl-6 mb-5 space-y-1.5 text-text-secondary">{children}</ol>,
    },
    listItem: {
      bullet: ({ children }) => <li className="leading-relaxed">{children}</li>,
      number: ({ children }) => <li className="leading-relaxed">{children}</li>,
    },
  };
}
