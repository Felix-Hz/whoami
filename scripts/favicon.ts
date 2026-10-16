import { writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Resvg } from "@resvg/resvg-js";
import { faceAscii } from "../src/assets/ascii-face";

// Favicon from the ASCII portrait. The portrait is read as a brightness map (each character's place on
// the density ramp), box-filtered down onto an exact 32px grid and thresholded to one ink. A dither
// reads as noise at tab size; a hard threshold keeps the hair, brow and beard as shapes. Output is
// pixel-exact SVG squares, so it stays crisp at any size.
// Run after changing the portrait:  pnpm exec tsx scripts/favicon.ts

const publicDir = resolve(dirname(fileURLToPath(import.meta.url)), "../public");

const RAMP = " .:-=+*#%@";
const CELL_W = 0.636; // Departure Mono advance; cells are 1em tall
const GRID = 32;

const lines = faceAscii.split("\n").filter((line) => line.length > 0);
const cols = Math.max(...lines.map((l) => l.length));
const density = (r: number, c: number) => Math.max(0, RAMP.indexOf(lines[r]?.[c] ?? " ")) / (RAMP.length - 1);

// Bounds of the head, in em, so the grid frames the face rather than the empty margins
let minC = cols;
let maxC = 0;
for (const line of lines) {
  const start = line.search(/\S/);
  if (start < 0) continue;
  minC = Math.min(minC, start);
  maxC = Math.max(maxC, line.trimEnd().length);
}
const width = (maxC - minC) * CELL_W;
const height = lines.length;
const side = Math.max(width, height) * 1.04;
const x0 = minC * CELL_W + width / 2 - side / 2;
const y0 = height / 2 - side / 2;

// Average density over each output pixel's footprint, sampled 4x4
function sample(px: number, py: number): number {
  let sum = 0;
  const n = 4;
  for (let sy = 0; sy < n; sy++) {
    for (let sx = 0; sx < n; sx++) {
      const x = x0 + ((px + (sx + 0.5) / n) / GRID) * side;
      const y = y0 + ((py + (sy + 0.5) / n) / GRID) * side;
      sum += density(Math.floor(y), Math.floor(x / CELL_W));
    }
  }
  return sum / (n * n);
}

// Contrast curve tuned by eye at 16 and 32px: lift the midtones so the features hold together
const ink = (v: number) => (v - 0.12) * 1.8 > 0.5;

const pixels: [number, number][] = [];
for (let y = 0; y < GRID; y++) {
  for (let x = 0; x < GRID; x++) {
    if (ink(sample(x, y))) pixels.push([x, y]);
  }
}

// One path of unit squares: smaller than individual rects, and crispEdges keeps them hard
const d = pixels.map(([x, y]) => `M${x} ${y}h1v1h-1z`).join("");

const svg = (
  light: string,
  dark: string | null,
  paper: string | null,
) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${GRID} ${GRID}" shape-rendering="crispEdges">${
  dark ? `<style>path{fill:${light}}@media (prefers-color-scheme: dark){path{fill:${dark}}}</style>` : ""
}${paper ? `<rect width="${GRID}" height="${GRID}" fill="${paper}"/>` : ""}<path${dark ? "" : ` fill="${light}"`} d="${d}"/></svg>
`;

// Tab icon: transparent, cobalt on light browser chrome and the lifted cobalt on dark
writeFileSync(resolve(publicDir, "favicon.svg"), svg("#1d3ea8", "#93a9ff", null));

// Raster fallbacks on paper, scaled by whole multiples so every dither pixel stays square
const png = (size: number, file: string) => {
  const art = svg("#1d3ea8", null, "#fafaf8");
  const out = new Resvg(art, { fitTo: { mode: "width", value: size }, shapeRendering: 0 }).render().asPng();
  writeFileSync(resolve(publicDir, file), out);
};
png(32, "favicon-32.png");
png(192, "icon-192.png");

// Home-screen icon: 180px is 36 units at 5px each, so the 32-unit face gets a 2-unit paper border
const touch = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 36 36" shape-rendering="crispEdges"><rect width="36" height="36" fill="#fafaf8"/><path fill="#1d3ea8" transform="translate(2 2)" d="${d}"/></svg>`;
writeFileSync(
  resolve(publicDir, "apple-touch-icon.png"),
  new Resvg(touch, { fitTo: { mode: "width", value: 180 }, shapeRendering: 0 }).render().asPng(),
);

console.log(`favicon: ${pixels.length} of ${GRID * GRID} pixels inked`);
