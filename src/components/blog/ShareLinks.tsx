import { useState } from "preact/hooks";

interface ShareLinksProps {
  title: string;
  url: string;
}

export function ShareLinks({ title, url }: ShareLinksProps) {
  const [copied, setCopied] = useState(false);

  const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`;
  const linkedinUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`;

  function copyToClipboard() {
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
        data-event="share:x"
      >
        x<span aria-hidden="true"> ↗</span>
      </a>
      <a
        href={linkedinUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="text-ink hover:text-accent"
        data-event="share:linkedin"
      >
        linkedin<span aria-hidden="true"> ↗</span>
      </a>
      <button
        type="button"
        onClick={copyToClipboard}
        data-event="share:copy"
        className="text-ink hover:text-accent cursor-pointer"
      >
        {copied ? "copied" : "copy link"}
      </button>
      <span className="sr-only" aria-live="polite">
        {copied ? "link copied" : ""}
      </span>
    </div>
  );
}
