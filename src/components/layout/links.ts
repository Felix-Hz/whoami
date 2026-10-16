// Chapters are numbered because they're a sequence on the home page; outbound links are not, and stay apart
// `section` is the chapter's id on the home page, for the running head's "you are here" mark
export const CHAPTERS = [
  { n: "01", label: "who", href: "/#who", section: "who" },
  { n: "02", label: "build", href: "/#build", section: "build" },
  { n: "03", label: "writing", href: "/blog", section: "writing" },
] as const;

export const OUTBOUND = [
  { label: "github", href: "https://github.com/Felix-Hz", track: "github" },
  { label: "linkedin", href: "https://www.linkedin.com/in/felix-hernandez-vieyra/", track: "linkedin" },
] as const;

export const EMAIL = "me@felix-hzv.dev";
