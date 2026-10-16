import { ditherParams, type KnobParams, LEVEL_DEFAULT } from "./ditherLevel";
import { frameClock, type Spring, spring, spring0 } from "./spring";

/**
 * The home page's one background: a 1-bit ordered dither of slow noise, printed in the accent ink at a
 * third of the CSS resolution and scaled up pixelated, like a risograph. One fixed canvas behind the
 * whole page; the pattern is anchored to the page, so it scrolls with the content. Its jobs:
 *  - give the page a faint printed texture along its left margin;
 *  - get out of the way of type: small type always keeps a soft clearing, and pointing at the hero's
 *    thesis clears the dither behind it, opening from the pointer (the name answers with its own halo, in CSS);
 *  - answer the pointer everywhere: a small lens that prints the field's negative wherever it passes;
 *  - hand the portrait back to the ink as the hero scrolls away (see heroProgress).
 * Raw WebGL on one fullscreen triangle, no library. Pauses in background tabs, drops to 30 fps when idle.
 */

// Boxes uploaded per frame: only those on screen. 48 uniform vectors plus a handful fits mobile GPUs (64)
const MAX_BOXES = 24;
const SCALE = 1 / 3; // canvas pixels per CSS pixel
const STEP = 1 / SCALE; // CSS px per canvas pixel: the canvas moves in whole steps of this, so dots never shimmer
const PAD = 12; // CSS px of air around a line of type; the feather adds five times this
// How much of the field each kind of block clears at rest, 0..1. The portrait keeps a fifth of the dither;
// type keeps 15% fewer dots than the portrait does
const PORTRAIT_CLEAR = 0.8;
const TEXT_CLEAR = 1 - (1 - PORTRAIT_CLEAR) * 0.85;

const VERT = "attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}";
const FRAG = `precision highp float;
uniform vec2 r;uniform float t;uniform vec2 m;uniform float mi;uniform vec3 ink;uniform vec3 paper;
uniform float scroll;uniform vec4 H;uniform vec3 K;
uniform vec4 L[${MAX_BOXES}];uniform vec4 P[${MAX_BOXES}];uniform float pad;
float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1.,0.)),f.x),mix(h(i+vec2(0.,1.)),h(i+vec2(1.,1.)),f.x),f.y);}
float b2(vec2 a){a=floor(a);return fract(a.x*.5+a.y*a.y*.75);}
float b4(vec2 a){return b2(.5*a)*.25+b2(a);}
float b8(vec2 a){return b4(.5*a)*.25+b2(a);}
float sdBox(vec2 p,vec2 c,vec2 b,float k){vec2 q=abs(p-c)-b+k;return length(max(q,0.))+min(max(q.x,q.y),0.)-k;}
void main(){
  vec2 px=gl_FragCoord.xy;
  // Page space: y grows downward from the top of the document, so noise and dots travel with the content
  vec2 pg=vec2(px.x,r.y-px.y+scroll);
  vec2 uv=pg/r.x*1.6;
  float n0=.6*n(uv*2.6+vec2(0.,t*.035))+.4*n(uv*6.-vec2(t*.03,0.));
  float x=px.x/r.x;
  // One quiet field across the whole page: sparse, kept to the left margin. inHero only tunes the lens below.
  float hy=(px.y-H.y)/max(1.,H.w-H.y);
  float inHero=step(0.,hy)*step(hy,1.)*smoothstep(0.,.22,hy)*smoothstep(0.,.08,1.-hy);
  // Above the default the field also spreads: from the left margin at 1 to the whole width at the top
  // K is the knob in the header: x is how high the noise must rise before it prints (so the knob
  // changes how much of the page carries dots), y the density where it does, z how far right it spreads
  float v=K.y*smoothstep(K.x,1.,n0)*(1.-smoothstep(.02,mix(.32,1.25,K.z),x));
  float k=0.;
  for(int i=0;i<${MAX_BOXES};i++){
    vec4 q=L[i];if(q.z<=q.x)continue;vec4 s=P[i];
    vec2 c=(q.xy+q.zw)*.5;vec2 b=(q.zw-q.xy)*.5;
    // A wide feather, so the field thins gradually toward type instead of stopping at an edge
    float box=1.-smoothstep(-pad*.5,pad*5.,sdBox(px,c,b,pad));
    float reveal=1.-smoothstep(s.z-pad*6.,s.z,length(px-s.xy));
    k=max(k,box*max(reveal,s.w));
  }
  v*=1.-k;
  // A hair of bias keeps empty paper clean without swallowing the faint end of the knob
  float field=step(b8(pg)+.004,v*.85);
  // The pointer lens is its own dithered bitmap, XOR'd with the field: where it meets the field it prints
  // the negative (dots become gaps, gaps become dots); over empty paper it's a light lens of its own.
  // It steps aside wherever type is clear.
  float d=length(px-m)/r.x*1.6;
  float l=mi*exp(-d*d*64.)*(1.-k)*(.38+.62*smoothstep(.02,.2,v))*mix(.6,1.,inHero);
  float lens=step(b8(pg+vec2(3.,5.))+.02,l*.95);
  gl_FragColor=vec4(mix(paper,ink,abs(field-lens)),1.);
}`;

interface Box {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

interface Block {
  el: HTMLElement;
  // Page coordinates (CSS px from the document's top-left)
  lines: Box[];
  union: Box | null;
  open: boolean;
  // Resting clearance behind the block, 0..1: 1 for small type, which must always read
  base: number;
  // Whether pointing at it opens a clearing (the hero's name and thesis)
  opens: boolean;
  // Per line, or one box for the whole element
  perLine: boolean;
  rd: Spring;
  ox: number;
  oy: number;
}

export interface DitherHandle {
  // Tears everything down, context included; only for leaving the page
  stop: () => void;
  // Live settings from the knob, see ditherParams
  setKnob: (params: KnobParams) => void;
  // The knob's on/off: pauses rendering and shows the static grid, keeping the GL context alive,
  // because a canvas can't get a fresh context once its old one has been released
  setEnabled: (on: boolean) => void;
}

export interface DitherOptions {
  canvas: HTMLCanvasElement;
  hero: HTMLElement;
  // Hero type that knocks the field out when pointed at
  texts: HTMLElement[];
  // Type that the field always stays clear of, pointer or not
  quiet?: HTMLElement[];
  // Kept thin behind the portrait until the hero scrolls away
  portrait?: HTMLElement | null;
  progress: () => number;
  knob?: KnobParams;
}

function parseColor(value: string): [number, number, number] {
  const v = value.trim();
  if (v.startsWith("#")) {
    const hex = v.length === 4 ? [...v.slice(1)].map((c) => c + c).join("") : v.slice(1, 7);
    return [0, 2, 4].map((i) => Number.parseInt(hex.slice(i, i + 2), 16) / 255) as [number, number, number];
  }
  const nums = v
    .match(/[\d.]+/g)
    ?.slice(0, 3)
    .map(Number) ?? [0, 0, 0];
  return nums.map((x) => x / 255) as [number, number, number];
}

const toPage = (q: DOMRect): Box => ({
  x0: q.left + window.scrollX,
  y0: q.top + window.scrollY,
  x1: q.right + window.scrollX,
  y1: q.bottom + window.scrollY,
});

// Line boxes of a block in page coordinates, merged per visual line
function lineBoxes(el: HTMLElement): Box[] {
  const range = document.createRange();
  range.selectNodeContents(el);
  const rows: (Box & { cy: number })[] = [];
  for (const q of range.getClientRects()) {
    if (q.width < 1 || q.height < 1) continue;
    const b = toPage(q);
    const cy = (b.y0 + b.y1) / 2;
    const row = rows.find((r) => Math.abs(r.cy - cy) < q.height * 0.4);
    if (row) {
      row.x0 = Math.min(row.x0, b.x0);
      row.x1 = Math.max(row.x1, b.x1);
      row.y0 = Math.min(row.y0, b.y0);
      row.y1 = Math.max(row.y1, b.y1);
    } else rows.push({ ...b, cy });
  }
  return rows.map(({ x0, y0, x1, y1 }) => ({ x0, y0, x1, y1 }));
}

function unionOf(boxes: Box[]): Box | null {
  if (boxes.length === 0) return null;
  return boxes.reduce((a, b) => ({
    x0: Math.min(a.x0, b.x0),
    y0: Math.min(a.y0, b.y0),
    x1: Math.max(a.x1, b.x1),
    y1: Math.max(a.y1, b.y1),
  }));
}

const near = (b: Box, x: number, y: number, pad: number) =>
  x >= b.x0 - pad && x <= b.x1 + pad && y >= b.y0 - pad && y <= b.y1 + pad;

// Distance from the block's origin to its farthest corner, plus the feather, so the opening covers it all
function reachOf(b: Block, u: Box) {
  const corners = [
    [u.x0, u.y0],
    [u.x1, u.y0],
    [u.x0, u.y1],
    [u.x1, u.y1],
  ];
  return Math.max(...corners.map(([x, y]) => Math.hypot(x - b.ox, y - b.oy))) + PAD * 4;
}

// Pointer in page coordinates
interface Pointer {
  x: number;
  y: number;
  inside: boolean;
}

function stepBlock(b: Block, pointer: Pointer, dt: number) {
  const u = b.union;
  if (!u || !b.opens) return;
  const { x, y, inside } = pointer;
  // Opening needs the pointer on a line; staying open only needs it near the block, so moving between lines never flickers
  const wants = inside && (b.open ? near(u, x, y, PAD * 2) : b.lines.some((l) => near(l, x, y, PAD * 0.5)));
  if (wants && !b.open && b.rd.x < 4) {
    b.ox = x;
    b.oy = y;
  }
  b.open = wants;
  // The origin drifts after the pointer, so the opening leans toward where you're reading
  if (b.open) {
    const k = 1 - Math.exp(-dt * 3.5);
    b.ox += (x - b.ox) * k;
    b.oy += (y - b.oy) * k;
  }
  // Opens briskly, closes a little slower: the ink settles back rather than snapping shut
  spring(b.rd, b.open ? reachOf(b, u) : 0, b.open ? 9 : 6.5, dt);
  if (!b.open && b.rd.x < 0.5) b.rd = spring0();
}

// Compiles the one program; null when the GPU refuses, so the caller keeps the poster.
// With KHR_parallel_shader_compile the driver compiles off the main thread and we poll once a frame,
// so booting the shader never blocks input.
async function compile(gl: WebGLRenderingContext) {
  const program = gl.createProgram();
  for (const [type, source] of [
    [gl.VERTEX_SHADER, VERT],
    [gl.FRAGMENT_SHADER, FRAG],
  ] as const) {
    const shader = gl.createShader(type);
    if (!shader) return null;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    gl.attachShader(program, shader);
  }
  gl.linkProgram(program);
  const parallel = gl.getExtension("KHR_parallel_shader_compile");
  if (parallel) {
    while (!gl.getProgramParameter(program, parallel.COMPLETION_STATUS_KHR)) {
      await new Promise(requestAnimationFrame);
    }
  }
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return null;
  gl.useProgram(program);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const attr = gl.getAttribLocation(program, "p");
  gl.enableVertexAttribArray(attr);
  gl.vertexAttribPointer(attr, 2, gl.FLOAT, false, 0, 0);
  return Object.fromEntries(
    ["r", "t", "m", "mi", "ink", "paper", "scroll", "H", "K", "L", "P", "pad"].map((k) => [
      k,
      gl.getUniformLocation(program, k),
    ]),
  );
}

const block = (el: HTMLElement, base: number, opens: boolean, perLine: boolean): Block => ({
  el,
  lines: [],
  union: null,
  open: false,
  base,
  opens,
  perLine,
  rd: spring0(),
  ox: 0,
  oy: 0,
});

function measureBlock(b: Block) {
  b.lines = b.perLine ? lineBoxes(b.el) : [toPage(b.el.getBoundingClientRect())];
  b.union = unionOf(b.lines);
}

export async function startDither({
  canvas,
  hero,
  texts,
  quiet = [],
  portrait,
  progress,
  knob = ditherParams(LEVEL_DEFAULT),
}: DitherOptions): Promise<DitherHandle | null> {
  const gl = canvas.getContext("webgl", { antialias: false, alpha: false, powerPreference: "low-power" });
  if (!gl) return null;
  const u = await compile(gl);
  if (!u) return null;
  gl.uniform1f(u.pad, PAD * SCALE);
  gl.uniform3fv(u.K, knob);

  // Hero type first, so it always wins a slot when the page has more type on screen than the GPU has room for
  const blocks: Block[] = [
    ...texts.map((el) => block(el, TEXT_CLEAR, true, true)),
    ...quiet.map((el) => block(el, TEXT_CLEAR, false, el.closest("[data-hero]") !== null)),
  ];
  const portraitBlock = portrait ? block(portrait, PORTRAIT_CLEAR, false, false) : null;

  const pointer: Pointer = { x: -1e4, y: -1e4, inside: false };
  const px = spring0(-1e4);
  const py = spring0(-1e4);
  const lens = spring0();
  const L = new Float32Array(MAX_BOXES * 4);
  const P = new Float32Array(MAX_BOXES * 4);
  const clock = frameClock();
  let cssHeight = 0;
  let heroBox: Box = { x0: 0, y0: 0, x1: 0, y1: 0 };
  let raf = 0;
  let lastFrame = 0;
  let lastActive = 0;

  const readColors = () => {
    const cs = getComputedStyle(hero);
    gl.uniform3fv(u.ink, parseColor(cs.getPropertyValue("--color-accent")));
    gl.uniform3fv(u.paper, parseColor(cs.getPropertyValue("--color-paper")));
  };

  // Layout is read here only: on resize, font load and theme change, never per frame
  const measure = () => {
    const w = Math.max(1, Math.round(canvas.clientWidth * SCALE));
    const h = Math.max(1, Math.round(canvas.clientHeight * SCALE));
    cssHeight = h / SCALE;
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
      gl.viewport(0, 0, w, h);
    }
    for (const b of blocks) measureBlock(b);
    if (portraitBlock) measureBlock(portraitBlock);
    heroBox = toPage(hero.getBoundingClientRect());
  };

  const step = (dt: number) => {
    spring(px, pointer.x, 18, dt);
    spring(py, pointer.y, 18, dt);
    for (const b of blocks) stepBlock(b, pointer, dt);
    // The lens is for open paper; while you're reading the hero it steps aside instead of crowding the line
    const reading = blocks.some((b) => b.open);
    spring(lens, pointer.inside && !reading ? 1 : 0, reading ? 10 : 6, dt);
  };

  // The canvas sits at the last whole canvas pixel above the scroll position, nudged up by the remainder
  // with a compositor-only transform; every dot stays put on the page while the content scrolls
  const place = () => {
    const top = Math.floor(window.scrollY / STEP) * STEP;
    canvas.style.transform = `translate3d(0,${top - window.scrollY}px,0)`;
    return top;
  };

  const upload = (top: number) => {
    L.fill(0);
    P.fill(0);
    const bottom = top + cssHeight;
    const toCanvas = (b: Box) => [
      b.x0 * SCALE,
      (cssHeight - (b.y1 - top)) * SCALE,
      b.x1 * SCALE,
      (cssHeight - (b.y0 - top)) * SCALE,
    ];
    let i = 0;
    const put = (b: Block, base: number) => {
      for (const l of b.lines) {
        if (i >= MAX_BOXES) return;
        if (l.y1 + PAD * 4 < top || l.y0 - PAD * 4 > bottom) continue;
        L.set(toCanvas(l), i * 4);
        P.set([b.ox * SCALE, (cssHeight - (b.oy - top)) * SCALE, b.rd.x * SCALE, base], i * 4);
        i++;
      }
    };
    for (const b of blocks) put(b, b.base);
    // As the hero scrolls away the portrait dissolves, and the ink fills the space it leaves
    if (portraitBlock) put(portraitBlock, portraitBlock.base * (1 - progress()));
    gl.uniform4fv(u.L, L);
    gl.uniform4fv(u.P, P);
    gl.uniform4f(
      u.H,
      0,
      (cssHeight - (heroBox.y1 - top)) * SCALE,
      canvas.width,
      (cssHeight - (heroBox.y0 - top)) * SCALE,
    );
  };

  const draw = (now: number) => {
    step(clock.tick(now));
    const top = place();
    upload(top);
    gl.uniform2f(u.r, canvas.width, canvas.height);
    gl.uniform1f(u.t, now / 1000);
    gl.uniform1f(u.scroll, top * SCALE);
    gl.uniform2f(u.m, px.x * SCALE, (cssHeight - (py.x - top)) * SCALE);
    gl.uniform1f(u.mi, lens.x);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };

  // Full rate while something is moving (pointer, scroll, springs); 30 fps when the page is just sitting there
  const busy = () =>
    lens.x > 0.001 ||
    Math.abs(lens.v) > 0.001 ||
    blocks.some((b) => b.open || b.rd.x > 0) ||
    performance.now() - lastActive < 600;

  let enabled = true;

  const loop = (now: number) => {
    if (document.hidden || !enabled) {
      raf = 0;
      return;
    }
    if (busy() || now - lastFrame > 32) {
      lastFrame = now;
      draw(now);
    }
    raf = requestAnimationFrame(loop);
  };
  const resume = () => {
    if (raf || document.hidden || !enabled) return;
    clock.reset();
    raf = requestAnimationFrame(loop);
  };

  const onMove = (e: PointerEvent) => {
    if (e.pointerType === "touch") return;
    const x = e.clientX + window.scrollX;
    const y = e.clientY + window.scrollY;
    if (!pointer.inside) {
      px.x = x;
      py.x = y;
    }
    Object.assign(pointer, { x, y, inside: true });
    lastActive = performance.now();
  };
  // Scrolling moves the page under a still pointer; keep it pinned to the same spot on screen
  let lastScroll = window.scrollY;
  const onScroll = () => {
    const dy = window.scrollY - lastScroll;
    lastScroll = window.scrollY;
    if (pointer.inside) {
      pointer.y += dy;
      py.x += dy;
    }
    lastActive = performance.now();
  };
  const onLeave = () => {
    pointer.inside = false;
  };
  const onVisibility = () => resume();
  const onScheme = () => {
    readColors();
    draw(performance.now());
  };
  const onLost = (e: Event) => {
    e.preventDefault();
    cancelAnimationFrame(raf);
    raf = 0;
    hero.dataset.dither = "lost";
  };

  const resizer = new ResizeObserver(() => {
    measure();
    draw(performance.now());
  });
  resizer.observe(canvas);
  resizer.observe(document.body);
  const scheme = matchMedia("(prefers-color-scheme: dark)");
  const themeAttr = new MutationObserver(onScheme);
  themeAttr.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

  window.addEventListener("pointermove", onMove, { passive: true });
  window.addEventListener("scroll", onScroll, { passive: true });
  document.documentElement.addEventListener("pointerleave", onLeave);
  document.addEventListener("visibilitychange", onVisibility);
  scheme.addEventListener("change", onScheme);
  canvas.addEventListener("webglcontextlost", onLost);
  document.fonts?.ready.then(() => {
    measure();
    draw(performance.now());
  });

  readColors();
  measure();
  // First frame on the next animation frame, then the poster steps aside
  requestAnimationFrame((now) => {
    draw(now);
    hero.dataset.dither = "on";
    resume();
  });

  const stop = () => {
    cancelAnimationFrame(raf);
    resizer.disconnect();
    themeAttr.disconnect();
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("scroll", onScroll);
    document.documentElement.removeEventListener("pointerleave", onLeave);
    document.removeEventListener("visibilitychange", onVisibility);
    scheme.removeEventListener("change", onScheme);
    canvas.removeEventListener("webglcontextlost", onLost);
    gl.getExtension("WEBGL_lose_context")?.loseContext();
    canvas.style.transform = "";
    canvas.style.visibility = "";
    delete hero.dataset.dither;
  };

  const setKnob = (next: KnobParams) => {
    gl.uniform3fv(u.K, next);
    lastActive = performance.now();
    if (enabled) draw(performance.now());
  };

  const setEnabled = (on: boolean) => {
    if (on === enabled) return;
    enabled = on;
    canvas.style.visibility = on ? "" : "hidden";
    if (on) {
      measure();
      draw(performance.now());
      hero.dataset.dither = "on";
      resume();
    } else {
      cancelAnimationFrame(raf);
      raf = 0;
      // Anything but "on" brings the static grid back (see .hero-poster in index.css)
      hero.dataset.dither = "off";
    }
  };

  return { stop, setKnob, setEnabled };
}
