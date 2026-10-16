import { useState } from "preact/hooks";
import { trackShareClick } from "@/utils/analytics";

interface ShareLinksProps {
  title: string;
  slug: string;
  url: string;
}

export function ShareLinks({ title, slug, url }: ShareLinksProps) {
  const [copied, setCopied] = useState(false);

  const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`;
  const linkedinUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`;

  function copyToClipboard() {
    trackShareClick("copy_link", slug);
    navigator.clipboard
      .writeText(url)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      })
      .catch(() => {
        // Clipboard refused (permissions or an old browser); the URL is still in the address bar
      });
  }

  return (
    <div className="meta flex flex-wrap items-baseline gap-x-6 gap-y-2">
      <span>share</span>
      <a
        href={twitterUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="text-ink hover:text-accent"
        onClick={() => trackShareClick("x", slug)}
      >
        x<span aria-hidden="true"> ↗</span>
      </a>
      <a
        href={linkedinUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="text-ink hover:text-accent"
        onClick={() => trackShareClick("linkedin", slug)}
      >
        linkedin<span aria-hidden="true"> ↗</span>
      </a>
      <button type="button" onClick={copyToClipboard} className="text-ink hover:text-accent cursor-pointer">
        {copied ? "copied" : "copy link"}
      </button>
      <span className="sr-only" aria-live="polite">
        {copied ? "link copied" : ""}
      </span>
    </div>
  );
}
