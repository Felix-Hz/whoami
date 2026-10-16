import { writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Resvg } from "@resvg/resvg-js";

// Favicon: the wordmark's "$" and block cursor, paper on a cobalt tile. The "$" is Departure Mono's own
// glyph, copied pixel for pixel (the face is drawn on an exact grid: 50 units a pixel, 11 pixels an em),
// so at 16px every font pixel lands on a screen pixel. Run after changing it:  pnpm exec tsx scripts/favicon.ts

const publicDir = resolve(dirname(fileURLToPath(import.meta.url)), "../public");

const INK = "#1d3ea8";
const PAPER = "#fafaf8";

// Departure Mono "$", 5 x 10 pixels
// biome-ignore format: one row per line, so the glyph reads as a picture
const DOLLAR = [
  "..#..",
  ".###.",
  "#.#.#",
  "#.#..",
  ".###.",
  "..#.#",
  "..#.#",
  "#.#.#",
  ".###.",
  "..#..",
];

// The cursor, in the wordmark's proportions: a narrow block, one pixel shorter than the "$" at each end
const GAP = 2;
const CURSOR = { w: 3, h: 8, top: 1 };

function markPath(ox: number, oy: number): string {
  const cells: string[] = [];
  DOLLAR.forEach((row, y) => {
    [...row].forEach((c, x) => {
      if (c === "#") cells.push(`M${ox + x} ${oy + y}h1v1h-1z`);
    });
  });
  const cx = ox + DOLLAR[0].length + GAP;
  cells.push(`M${cx} ${oy + CURSOR.top}h${CURSOR.w}v${CURSOR.h}h-${CURSOR.w}z`);
  return cells.join("");
}

const MARK_W = DOLLAR[0].length + GAP + CURSOR.w;
const MARK_H = DOLLAR.length;

// A square tile of `grid` units with the mark centred on whole units
function tile(grid: number): string {
  const ox = Math.floor((grid - MARK_W) / 2);
  const oy = Math.floor((grid - MARK_H) / 2);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${grid} ${grid}" shape-rendering="crispEdges"><rect width="${grid}" height="${grid}" fill="${INK}"/><path fill="${PAPER}" d="${markPath(ox, oy)}"/></svg>
`;
}

const png = (svg: string, size: number, file: string) =>
  writeFileSync(
    resolve(publicDir, file),
    new Resvg(svg, { fitTo: { mode: "width", value: size }, shapeRendering: 0 }).render().asPng(),
  );

// 16 units, so 16px and 32px are exact pixel multiples
const icon = tile(16);
writeFileSync(resolve(publicDir, "favicon.svg"), icon);
png(icon, 32, "favicon-32.png");
png(icon, 192, "icon-192.png");
// Home screens crop to a rounded square; 18 units at 10px each leaves the mark clear of the corners
png(tile(18), 180, "apple-touch-icon.png");

console.log("favicon: $ and cursor on a 16-unit grid");
