import { frameClock, type Spring, spring, spring0 } from "./spring";

/**
 * The home page's one background: a 1-bit ordered dither of slow noise, printed in the accent ink at a
 * third of the CSS resolution and scaled up pixelated, like a risograph. Its jobs:
 *  - give the hero a printed texture, densest on the left;
 *  - get out of the way of type: pointing at a line clears the dither behind it, opening from the pointer;
 *  - answer the pointer: a small lens that prints the field's negative wherever it passes;
 *  - hand the portrait back to the ink as the hero scrolls away (see heroProgress).
 * Raw WebGL on one fullscreen triangle, no library. Pauses offscreen and in background tabs.
 */

const MAX_BOXES = 18; // margin + name + thesis lines on a phone, plus the portrait; 36 uniform vectors fits every GPU we target
const SCALE = 1 / 3; // canvas pixels per CSS pixel
const PAD = 12; // CSS px of air around a line of type; the feather adds three times this

const VERT = "attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}";
const FRAG = `precision highp float;
uniform vec2 r;uniform float t;uniform vec2 m;uniform float mi;uniform vec3 ink;uniform vec3 paper;
uniform vec4 L[${MAX_BOXES}];uniform vec4 P[${MAX_BOXES}];uniform float pad;
float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1.,0.)),f.x),mix(h(i+vec2(0.,1.)),h(i+vec2(1.,1.)),f.x),f.y);}
float b2(vec2 a){a=floor(a);return fract(a.x*.5+a.y*a.y*.75);}
float b4(vec2 a){return b2(.5*a)*.25+b2(a);}
float b8(vec2 a){return b4(.5*a)*.25+b2(a);}
float sdBox(vec2 p,vec2 c,vec2 b,float k){vec2 q=abs(p-c)-b+k;return length(max(q,0.))+min(max(q.x,q.y),0.)-k;}
void main(){
  vec2 px=gl_FragCoord.xy;vec2 uv=px/r.y;
  float v=.6*n(uv*2.6+vec2(0.,t*.035))+.4*n(uv*6.-vec2(t*.03,0.));
  // Densest at the left edge, fading out before the portrait on the right
  v=pow(v,2.2)*1.1*(1.-smoothstep(.03,.62,px.x/r.x));
  // Fade out toward the hero's top and bottom so the field has no hard edge
  v*=smoothstep(0.,.22,px.y/r.y)*smoothstep(0.,.08,1.-px.y/r.y);
  float k=0.;
  for(int i=0;i<${MAX_BOXES};i++){
    vec4 q=L[i];if(q.z<=q.x)continue;vec4 s=P[i];
    vec2 c=(q.xy+q.zw)*.5;vec2 b=(q.zw-q.xy)*.5;
    float box=1.-smoothstep(0.,pad*3.,sdBox(px,c,b,pad));
    float reveal=1.-smoothstep(s.z-pad*6.,s.z,length(px-s.xy));
    k=max(k,box*max(reveal,s.w));
  }
  v*=1.-k;
  float field=step(b8(px)+.02,v*.85);
  // The pointer lens is its own dithered bitmap, XOR'd with the field: where it meets the field it prints
  // the negative (dots become gaps, gaps become dots); over empty paper it's a light lens of its own.
  // It steps aside wherever type is opening.
  float d=length(px-m)/r.y;
  float l=mi*exp(-d*d*64.)*(1.-k)*(.38+.62*smoothstep(.02,.2,v));
  float lens=step(b8(px+vec2(3.,5.))+.02,l*.95);
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
  lines: Box[];
  union: Box | null;
  open: boolean;
  // Resting clearance behind the block, 0..1: touch screens can't hover, so their type always gets some
  base: number;
  rd: Spring;
  ox: number;
  oy: number;
}

export interface DitherOptions {
  canvas: HTMLCanvasElement;
  hero: HTMLElement;
  // Blocks of type that knock the field out when pointed at
  texts: HTMLElement[];
  // Small type that the field always stays clear of, pointer or not (the hero's margin notes)
  quiet?: HTMLElement[];
  // Kept thin behind the portrait until the hero scrolls away
  portrait?: HTMLElement | null;
  progress: () => number;
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

// Line boxes of a block, relative to `origin`, merged per visual line
function lineBoxes(el: HTMLElement, origin: DOMRect): Box[] {
  const range = document.createRange();
  range.selectNodeContents(el);
  const rows: (Box & { cy: number })[] = [];
  for (const q of range.getClientRects()) {
    if (q.width < 1 || q.height < 1) continue;
    const cy = (q.top + q.bottom) / 2;
    const row = rows.find((r) => Math.abs(r.cy - cy) < q.height * 0.4);
    if (row) {
      row.x0 = Math.min(row.x0, q.left);
      row.x1 = Math.max(row.x1, q.right);
      row.y0 = Math.min(row.y0, q.top);
      row.y1 = Math.max(row.y1, q.bottom);
    } else rows.push({ x0: q.left, x1: q.right, y0: q.top, y1: q.bottom, cy });
  }
  return rows.map((r) => ({
    x0: r.x0 - origin.left,
    x1: r.x1 - origin.left,
    y0: r.y0 - origin.top,
    y1: r.y1 - origin.top,
  }));
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

function stepBlock(b: Block, pointer: { x: number; y: number; inside: boolean }, dt: number) {
  const u = b.union;
  if (!u) return;
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
    ["r", "t", "m", "mi", "ink", "paper", "L", "P", "pad"].map((k) => [k, gl.getUniformLocation(program, k)]),
  );
}

export async function startDither({
  canvas,
  hero,
  texts,
  quiet = [],
  portrait,
  progress,
}: DitherOptions): Promise<(() => void) | null> {
  const gl = canvas.getContext("webgl", { antialias: false, alpha: false, powerPreference: "low-power" });
  if (!gl) return null;
  const u = await compile(gl);
  if (!u) return null;
  gl.uniform1f(u.pad, PAD * SCALE);

  const touch = matchMedia("(hover: none)").matches;
  const block = (el: HTMLElement, base: number): Block => ({
    el,
    lines: [],
    union: null,
    open: false,
    base,
    rd: spring0(),
    ox: 0,
    oy: 0,
  });
  const blocks: Block[] = [...quiet.map((el) => block(el, 1)), ...texts.map((el) => block(el, touch ? 0.7 : 0))];
  const portraitBlock: Block | null = portrait
    ? { el: portrait, lines: [], union: null, open: false, base: 0.8, rd: spring0(), ox: 0, oy: 0 }
    : null;

  const pointer = { x: -1e4, y: -1e4, inside: false };
  const px = spring0(-1e4);
  const py = spring0(-1e4);
  const lens = spring0();
  const L = new Float32Array(MAX_BOXES * 4);
  const P = new Float32Array(MAX_BOXES * 4);
  const clock = frameClock();
  let width = 0;
  let height = 0;
  let visible = false;
  let raf = 0;

  const readColors = () => {
    const cs = getComputedStyle(hero);
    gl.uniform3fv(u.ink, parseColor(cs.getPropertyValue("--color-accent")));
    gl.uniform3fv(u.paper, parseColor(cs.getPropertyValue("--color-paper")));
  };

  // Layout is read here only: on resize, font load and theme change, never per frame
  const measure = () => {
    const origin = canvas.getBoundingClientRect();
    width = origin.width;
    height = origin.height;
    const w = Math.max(1, Math.round(width * SCALE));
    const h = Math.max(1, Math.round(height * SCALE));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
      gl.viewport(0, 0, w, h);
    }
    for (const b of blocks) {
      b.lines = lineBoxes(b.el, origin);
      b.union = unionOf(b.lines);
    }
    if (portraitBlock) {
      const q = portraitBlock.el.getBoundingClientRect();
      portraitBlock.lines = [
        { x0: q.left - origin.left, y0: q.top - origin.top, x1: q.right - origin.left, y1: q.bottom - origin.top },
      ];
      portraitBlock.union = portraitBlock.lines[0];
    }
  };

  const step = (dt: number) => {
    spring(px, pointer.x, 18, dt);
    spring(py, pointer.y, 18, dt);
    for (const b of blocks) stepBlock(b, pointer, dt);
    // The lens is for empty paper; while you're reading it steps aside instead of crowding the line
    const reading = blocks.some((b) => b.open);
    spring(lens, pointer.inside && !reading ? 1 : 0, reading ? 10 : 6, dt);
  };

  const upload = () => {
    L.fill(0);
    P.fill(0);
    let i = 0;
    const put = (b: Block, base: number) => {
      for (const l of b.lines) {
        if (i >= MAX_BOXES) return;
        L.set([l.x0 * SCALE, (height - l.y1) * SCALE, l.x1 * SCALE, (height - l.y0) * SCALE], i * 4);
        P.set([b.ox * SCALE, (height - b.oy) * SCALE, b.rd.x * SCALE, base], i * 4);
        i++;
      }
    };
    for (const b of blocks) put(b, b.base);
    // As the hero scrolls away the portrait dissolves, and the ink fills the space it leaves
    if (portraitBlock) put(portraitBlock, portraitBlock.base * (1 - progress()));
    gl.uniform4fv(u.L, L);
    gl.uniform4fv(u.P, P);
  };

  const draw = (now: number) => {
    step(clock.tick(now));
    upload();
    gl.uniform2f(u.r, canvas.width, canvas.height);
    gl.uniform1f(u.t, now / 1000);
    gl.uniform2f(u.m, px.x * SCALE, (height - py.x) * SCALE);
    gl.uniform1f(u.mi, lens.x);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };

  const loop = (now: number) => {
    if (!visible || document.hidden) {
      raf = 0;
      return;
    }
    draw(now);
    raf = requestAnimationFrame(loop);
  };
  const resume = () => {
    if (raf || !visible || document.hidden) return;
    clock.reset();
    raf = requestAnimationFrame(loop);
  };

  const onMove = (e: PointerEvent) => {
    if (e.pointerType === "touch") return;
    const q = canvas.getBoundingClientRect();
    const x = e.clientX - q.left;
    const y = e.clientY - q.top;
    if (!pointer.inside) {
      px.x = x;
      py.x = y;
    }
    Object.assign(pointer, { x, y, inside: true });
  };
  const onLeave = () => {
    pointer.inside = false;
  };
  const onVisibility = () => resume();
  const onScheme = () => {
    readColors();
    if (!raf) draw(performance.now());
  };
  const onLost = (e: Event) => {
    e.preventDefault();
    cancelAnimationFrame(raf);
    raf = 0;
    hero.dataset.dither = "lost";
  };

  const resizer = new ResizeObserver(() => {
    measure();
    if (!raf) draw(performance.now());
  });
  resizer.observe(canvas);
  const seen = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    resume();
  });
  seen.observe(canvas);
  const scheme = matchMedia("(prefers-color-scheme: dark)");
  const themeAttr = new MutationObserver(onScheme);
  themeAttr.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

  hero.addEventListener("pointermove", onMove, { passive: true });
  hero.addEventListener("pointerleave", onLeave);
  document.addEventListener("visibilitychange", onVisibility);
  scheme.addEventListener("change", onScheme);
  canvas.addEventListener("webglcontextlost", onLost);
  document.fonts?.ready.then(() => {
    measure();
    if (!raf) draw(performance.now());
  });

  readColors();
  measure();
  // First frame on the next animation frame, then the poster steps aside
  requestAnimationFrame((now) => {
    draw(now);
    hero.dataset.dither = "on";
    resume();
  });

  return () => {
    cancelAnimationFrame(raf);
    resizer.disconnect();
    seen.disconnect();
    themeAttr.disconnect();
    hero.removeEventListener("pointermove", onMove);
    hero.removeEventListener("pointerleave", onLeave);
    document.removeEventListener("visibilitychange", onVisibility);
    scheme.removeEventListener("change", onScheme);
    canvas.removeEventListener("webglcontextlost", onLost);
    gl.getExtension("WEBGL_lose_context")?.loseContext();
    delete hero.dataset.dither;
  };
}
