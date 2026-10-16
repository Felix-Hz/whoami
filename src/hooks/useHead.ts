import { useEffect } from "preact/hooks";
import { collectHead, type HeadMeta } from "@/head";

function setMeta(attr: string, value: string, key: "name" | "property" = "name") {
  let el = document.querySelector(`meta[${key}="${attr}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(key, attr);
    document.head.appendChild(el);
  }
  el.setAttribute("content", value);
}

export function useHead({ title, description, url, image, type = "website", publishedTime }: HeadMeta) {
  collectHead({ title, description, url, image, type, publishedTime });

  useEffect(() => {
    document.title = title;
    setMeta("description", description);
    setMeta("og:title", title, "property");
    setMeta("og:description", description, "property");
    setMeta("og:url", url, "property");
    setMeta("og:type", type, "property");
    if (publishedTime) setMeta("article:published_time", publishedTime, "property");
    setMeta("twitter:card", image ? "summary_large_image" : "summary");
    setMeta("twitter:title", title);
    setMeta("twitter:description", description);
    if (image) {
      setMeta("og:image", image, "property");
      setMeta("twitter:image", image);
    }
  }, [title, description, url, image, type, publishedTime]);
}
