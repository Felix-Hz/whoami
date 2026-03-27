import { useEffect } from "preact/hooks";

interface HeadOptions {
  title: string;
  description: string;
  url: string;
  image?: string;
}

function setMeta(attr: string, value: string, key: "name" | "property" = "name") {
  let el = document.querySelector(`meta[${key}="${attr}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(key, attr);
    document.head.appendChild(el);
  }
  el.setAttribute("content", value);
}

export function useHead({ title, description, url, image }: HeadOptions) {
  useEffect(() => {
    document.title = title;
    setMeta("description", description);
    setMeta("og:title", title, "property");
    setMeta("og:description", description, "property");
    setMeta("og:url", url, "property");
    setMeta("og:type", "article", "property");
    setMeta("twitter:card", image ? "summary_large_image" : "summary");
    setMeta("twitter:title", title);
    setMeta("twitter:description", description);
    if (image) {
      setMeta("og:image", image, "property");
      setMeta("twitter:image", image);
    }
  }, [title, description, url, image]);
}
