// Scenes: a frame described as named elements (fills, photos, lines of text)
// instead of draw calls. Templates that describe their frames this way draw
// through renderScene, and reels can "smart animate" between them: elements
// with the same key on both screens glide from one to the other, the rest fade.
//
// Keys say what an element *is*, so they match across templates:
//   "background", "overlay"         the base colour and a photo's darkening layer
//   "photo:<image>"                 a photo (repeats get "#2", "#3"…)
//   "text:<words>"                  a line of text (identical words match)
import { withEntrance, type EntranceState } from "./entrance";
import type { Ctx2D, DrawEnv } from "./index";

/** Top-left box in canvas pixels. */
export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface Base {
  key: string;
  /** 0–1, default 1. */
  alpha?: number;
  /** Entrance state at this frame (skipped when the element arrived by smart animate). */
  enter?: EntranceState;
  /** The entrance's box (centre x/y, size) if it differs from the element's box. */
  enterBox?: { x: number; y: number; w: number; h: number };
}

export interface FillElement extends Base {
  kind: "fill";
  box: Box;
  colour: string;
  radius?: number;
}

export interface PhotoElement extends Base {
  kind: "photo";
  box: Box;
  src: string;
  radius?: number;
  /** Scale about the box centre (push-ins), and a shift in pixels. */
  zoom?: number;
  dx?: number;
  dy?: number;
  /** Colour under the photo (shows while it loads, or if it's missing). */
  under?: string;
}

export interface TextElement extends Base {
  kind: "text";
  /** The line's extent: measured width × line height. Text is centred in it. */
  box: Box;
  text: string;
  /** Font for ctx.font (see fontCss). */
  font: string;
  px: number;
  colour: string;
  /** A rounded band behind the text (for words over photos). */
  band?: { colour: string; alpha: number; padX: number; padY: number; radius: number };
}

export type SceneElement = FillElement | PhotoElement | TextElement;

/** Give repeated keys a "#n" suffix so every key in a scene is unique. */
export function uniqueKeys(elements: SceneElement[]): SceneElement[] {
  const seen = new Map<string, number>();
  return elements.map((el) => {
    const n = (seen.get(el.key) ?? 0) + 1;
    seen.set(el.key, n);
    return n === 1 ? el : { ...el, key: `${el.key}#${n}` };
  });
}

const centre = (b: Box) => ({ x: b.x + b.w / 2, y: b.y + b.h / 2, w: b.w, h: b.h });

function paint(ctx: Ctx2D, el: SceneElement, env: DrawEnv) {
  const b = el.box;
  if (el.kind === "fill") {
    ctx.fillStyle = el.colour;
    if (el.radius) {
      ctx.beginPath();
      ctx.roundRect(b.x, b.y, b.w, b.h, el.radius);
      ctx.fill();
    } else ctx.fillRect(b.x, b.y, b.w, b.h);
    return;
  }
  if (el.kind === "photo") {
    ctx.save();
    ctx.beginPath();
    if (el.radius) ctx.roundRect(b.x, b.y, b.w, b.h, el.radius);
    else ctx.rect(b.x, b.y, b.w, b.h);
    ctx.clip();
    if (el.under) {
      ctx.fillStyle = el.under;
      ctx.fillRect(b.x, b.y, b.w, b.h);
    }
    const img = env.image(el.src);
    if (img) {
      const z = el.zoom ?? 1;
      const c = centre(b);
      ctx.translate(c.x + (el.dx ?? 0), c.y + (el.dy ?? 0));
      ctx.scale(z, z);
      ctx.translate(-c.x, -c.y);
      drawCoverInto(ctx, img, b);
    }
    ctx.restore();
    return;
  }
  const c = centre(b);
  if (el.band && el.band.alpha > 0) {
    const { padX, padY, radius } = el.band;
    ctx.save();
    ctx.globalAlpha *= el.band.alpha;
    ctx.fillStyle = el.band.colour;
    ctx.beginPath();
    ctx.roundRect(b.x - padX, c.y - b.h / 2 - padY, b.w + padX * 2, b.h + padY * 2, radius);
    ctx.fill();
    ctx.restore();
  }
  ctx.font = el.font;
  ctx.fillStyle = el.colour;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(el.text, c.x, c.y);
}

function drawCoverInto(ctx: Ctx2D, img: CanvasImageSource, b: Box) {
  const iw = (img as HTMLImageElement).naturalWidth || (img as { width: number }).width;
  const ih = (img as HTMLImageElement).naturalHeight || (img as { height: number }).height;
  if (!iw || !ih) return;
  const s = Math.max(b.w / iw, b.h / ih);
  ctx.drawImage(img, b.x + (b.w - iw * s) / 2, b.y + (b.h - ih * s) / 2, iw * s, ih * s);
}

/** Draw one element with its alpha and entrance. */
export function drawElement(ctx: Ctx2D, el: SceneElement, env: DrawEnv, skipEnter = false) {
  const alpha = el.alpha ?? 1;
  if (alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha *= Math.min(1, alpha);
  if (el.enter && !skipEnter) withEntrance(ctx, el.enter, el.enterBox ?? centre(el.box), () => paint(ctx, el, env));
  else paint(ctx, el, env);
  ctx.restore();
}

/** Draw a scene. Elements whose keys are in env.arrived came in by smart animate: no entrance. */
export function renderScene(ctx: Ctx2D, scene: SceneElement[], env: DrawEnv) {
  for (const el of scene) drawElement(ctx, el, env, env.arrived?.has(el.key));
}

// ---------- smart animate ----------

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const lerpBox = (a: Box, b: Box, t: number): Box => ({ x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t), w: lerp(a.w, b.w, t), h: lerp(a.h, b.h, t) });
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

function hexRgb(hex: string): [number, number, number] | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function lerpColour(a: string, b: string, t: number): string {
  const A = hexRgb(a);
  const B = hexRgb(b);
  if (!A || !B) return t < 0.5 ? a : b;
  const k = clamp01(t);
  return `rgb(${A.map((v, i) => Math.round(lerp(v, B[i], k))).join(" ")})`;
}

/** Keys present in both scenes: what smart animate moves rather than fades. */
export function matchedKeys(a: SceneElement[], b: SceneElement[]): Set<string> {
  const inA = new Set(a.map((e) => e.key));
  return new Set(b.filter((e) => inA.has(e.key) && a.find((x) => x.key === e.key)!.kind === e.kind).map((e) => e.key));
}

/**
 * One frame of a smart animate from scene `a` (the outgoing screen) to `b` (the incoming one) at
 * progress `t` (0 → 1, may overshoot on a bouncy spring). Matched elements move, resize and recolour;
 * the outgoing screen's other elements fade out above their nearest matched neighbour, the incoming
 * screen's other elements fade in (still playing their own entrances).
 */
export function renderSmart(ctx: Ctx2D, a: SceneElement[], b: SceneElement[], t: number, env: DrawEnv, matched: Set<string>) {
  const k = clamp01(t);
  const byKey = new Map(a.map((e) => [e.key, e]));
  // Outgoing-only elements ride on the matched element below them in the outgoing screen.
  const riders = new Map<string, SceneElement[]>();
  let anchor = "";
  for (const el of a) {
    if (matched.has(el.key)) anchor = el.key;
    else riders.set(anchor, [...(riders.get(anchor) ?? []), el]);
  }
  const fadeOut = (key: string) => {
    for (const el of riders.get(key) ?? []) drawElement(ctx, { ...el, alpha: (el.alpha ?? 1) * (1 - k) }, env);
  };

  fadeOut("");
  for (const el of b) {
    const from = byKey.get(el.key);
    if (!from || !matched.has(el.key)) {
      drawElement(ctx, { ...el, alpha: (el.alpha ?? 1) * k }, env);
      continue;
    }
    drawElement(ctx, morph(from, el, t), env, true);
    fadeOut(el.key);
  }
}

function morph(a: SceneElement, b: SceneElement, t: number): SceneElement {
  const k = clamp01(t);
  const alpha = lerp(a.alpha ?? 1, b.alpha ?? 1, k);
  const box = lerpBox(a.box, b.box, t);
  if (a.kind === "fill" && b.kind === "fill") {
    return { ...b, box, alpha, colour: lerpColour(a.colour, b.colour, k), radius: lerp(a.radius ?? 0, b.radius ?? 0, k), enter: undefined };
  }
  if (a.kind === "photo" && b.kind === "photo") {
    return {
      ...b, box, alpha, enter: undefined,
      radius: lerp(a.radius ?? 0, b.radius ?? 0, k),
      zoom: lerp(a.zoom ?? 1, b.zoom ?? 1, t),
      dx: lerp(a.dx ?? 0, b.dx ?? 0, t),
      dy: lerp(a.dy ?? 0, b.dy ?? 0, t),
    };
  }
  if (a.kind === "text" && b.kind === "text") {
    const px = lerp(a.px, b.px, t);
    // Same words, maybe another typeface or size: scale the font and fade between typefaces.
    const font = (k < 0.5 ? a.font : b.font).replace(/\b[\d.]+px\b/, `${px.toFixed(2)}px`);
    const band = a.band || b.band
      ? { ...(b.band ?? a.band)!, alpha: lerp(a.band?.alpha ?? 0, b.band?.alpha ?? 0, k) }
      : undefined;
    return { ...b, box, alpha, px, font, colour: lerpColour(a.colour, b.colour, k), band, enter: undefined };
  }
  return t < 0.5 ? a : b;
}

