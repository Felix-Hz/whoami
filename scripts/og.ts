import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Resvg } from "@resvg/resvg-js";
import satori from "satori";

// Build-time OG images (1200×630) in the site's own type and ink: a dotted margin, the wordmark,
// mono metadata, and the title in the display cut. Nothing here ships to the browser.

const fontsDir = resolve(dirname(fileURLToPath(import.meta.url)), "../fonts/og");
const font = (file: string) => readFileSync(resolve(fontsDir, file));

const FONTS = [
  { name: "display", data: font("newsreader-display.ttf"), weight: 400 as const, style: "normal" as const },
  { name: "text", data: font("newsreader.ttf"), weight: 400 as const, style: "normal" as const },
  { name: "mono", data: font("jetbrains-mono.ttf"), weight: 400 as const, style: "normal" as const },
  { name: "pixel", data: font("departure-mono.otf"), weight: 400 as const, style: "normal" as const },
];

// Light-theme tokens from src/index.css
const PAPER = "#fafaf8";
const INK = "#15161b";
const INK_3 = "#5f6270";
const RULE = "#dadbe2";
const ACCENT = "#1d3ea8";

type Style = Record<string, string | number>;
interface Node {
  type: string;
  props: { style?: Style; children?: (Node | string)[] | Node | string };
}

const el = (style: Style, ...children: (Node | string)[]): Node => ({ type: "div", props: { style, children } });

// The dither field, as a dot screen that thins out to the right across the margin
function margin(): Node {
  const bands = [0.55, 0.38, 0.22, 0.1];
  return el(
    { display: "flex", position: "absolute", left: 0, top: 0, bottom: 0, width: 300 },
    ...bands.map((opacity) =>
      el({
        display: "flex",
        flex: 1,
        opacity,
        backgroundImage: `radial-gradient(circle, ${ACCENT} 1.6px, transparent 1.9px)`,
        backgroundSize: "9px 9px",
      }),
    ),
  );
}

function wordmark(): Node {
  return el(
    { display: "flex", alignItems: "center", fontFamily: "pixel", fontSize: 30, color: ACCENT },
    "$ whoami",
    el({ display: "flex", width: 17, height: 30, marginLeft: 3, backgroundColor: ACCENT }),
  );
}

// Size the title to its length so long titles stay within three lines
function titleSize(title: string): number {
  if (title.length <= 28) return 96;
  if (title.length <= 48) return 80;
  if (title.length <= 72) return 66;
  return 56;
}

function card(meta: string, title: string, footer: string): Node {
  return el(
    {
      display: "flex",
      position: "relative",
      width: "100%",
      height: "100%",
      backgroundColor: PAPER,
      color: INK,
    },
    margin(),
    el(
      {
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        position: "absolute",
        left: 340,
        right: 72,
        top: 64,
        bottom: 56,
      },
      el(
        { display: "flex", flexDirection: "column", gap: 28 },
        wordmark(),
        el({ display: "flex", fontFamily: "mono", fontSize: 22, color: INK_3 }, meta),
      ),
      el(
        {
          display: "flex",
          fontFamily: "display",
          fontSize: titleSize(title),
          lineHeight: 1.02,
          letterSpacing: "-0.025em",
          color: INK,
        },
        title,
      ),
      el(
        {
          display: "flex",
          justifyContent: "space-between",
          borderTop: `1px solid ${RULE}`,
          paddingTop: 18,
          fontFamily: "mono",
          fontSize: 20,
          color: INK_3,
        },
        // Satori merges sibling text nodes, so each needs its own box for space-between to apply
        el({ display: "flex" }, footer),
        el({ display: "flex" }, "felix hernandez vieyra"),
      ),
    ),
  );
}

async function render(node: Node): Promise<Buffer> {
  // satori takes React-shaped elements; these plain objects are exactly that shape
  const svg = await satori(node as unknown as Parameters<typeof satori>[0], { width: 1200, height: 630, fonts: FONTS });
  return new Resvg(svg, { fitTo: { mode: "width", value: 1200 } }).render().asPng();
}

export function postImage(post: { title: string; publishedAt: string; readingTime: number; slug: string }) {
  return render(
    card(`${post.publishedAt.slice(0, 10)} · ${post.readingTime} min`, post.title, `felix-hzv.dev/blog/${post.slug}`),
  );
}

export function homeImage() {
  return render(card("software engineer · writing at /blog", "felix hernandez vieyra", "felix-hzv.dev"));
}
