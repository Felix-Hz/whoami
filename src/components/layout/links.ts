// Chapters are numbered because they're a sequence on the home page; outbound links are not, and stay apart
export const CHAPTERS = [
  { n: "01", label: "who", href: "/#who" },
  { n: "02", label: "build", href: "/#build" },
  { n: "03", label: "writing", href: "/blog" },
] as const;

export const OUTBOUND = [
  { label: "github", href: "https://github.com/Felix-Hz", track: "github" },
  { label: "linkedin", href: "https://www.linkedin.com/in/felix-hernandez-vieyra/", track: "linkedin" },
] as const;

export const EMAIL = "me@felix-hzv.dev";
