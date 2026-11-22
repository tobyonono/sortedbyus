// Reels: an ordered list of screens, each pointing at a composition, with an
// optional trim and a transition into the next screen. A reel is just another
// playable, so the stage, exporter and previews treat it like a composition.
// brand comes straight from the JSON (not ./index) because index re-exports this module.
import brand from "../brand.json";
import { colour, formatSize, type Ctx2D, type DrawEnv, type FormatKey, type Segment } from "./index";
import type { Playable, PlayableSource } from "./playable";
import { springAt, springSettling, type Spring } from "./spring";
import { matchedKeys, renderSmart } from "./scene";

export const TRANSITION_TYPES = ["cut", "crossfade", "push", "slide", "smart"] as const;
export type TransitionType = (typeof TRANSITION_TYPES)[number];
export const TRANSITION_LABELS: Record<TransitionType, string> = { cut: "Cut", crossfade: "Crossfade", push: "Push", slide: "Slide", smart: "Smart" };
export const DIRECTIONS = ["left", "right", "up", "down"] as const;
export type Direction = (typeof DIRECTIONS)[number];

export interface ReelTransition {
  type: TransitionType;
  direction: Direction;
  seconds: number;
  spring: Spring & { preset?: string };
}

export interface ReelScreen {
  _key: string;
  /** Sanity reference to a motionComposition (weak, so agent drafts and deleted ones are allowed). */
  composition?: { _ref: string; _type?: string; _weak?: boolean } | null;
  trimStart: number;
  trimEnd: number;
  /** Transition from this screen into the next one (ignored on the last screen). */
  transition: ReelTransition;
}

export interface ReelData {
  format: FormatKey;
  fps: number;
  screens: ReelScreen[];
}

/** A brand spring by preset name, numbers only (no display label, which isn't part of the saved data). */
function springFromPreset(preset: string | undefined): (Spring & { preset: string }) | null {
  const p = preset ? (brand.springs as Record<string, Spring & { label: string }>)[preset] : undefined;
  return p ? { preset: preset!, stiffness: p.stiffness, damping: p.damping, mass: p.mass, velocity: p.velocity } : null;
}

export const DEFAULT_TRANSITION: ReelTransition = {
  type: "crossfade",
  direction: "left",
  seconds: 0.5,
  spring: springFromPreset("gentle")!,
};

/** Fill gaps and replace anything invalid, so any stored reel can play. */
export function normaliseReel(raw: unknown): ReelData {
  const r = (raw && typeof raw === "object" ? raw : {}) as Partial<ReelData>;
  const format = r.format && r.format in brand.formats ? r.format : "story";
  const fps = brand.fps.includes(r.fps as number) ? (r.fps as number) : 25;
  const screens = (Array.isArray(r.screens) ? r.screens : []).map((s, i): ReelScreen => {
    const t = (s?.transition ?? {}) as Partial<ReelTransition>;
    const sp = t.spring as Partial<Spring & { preset?: string }> | undefined;
    const springOk = sp && [sp.stiffness, sp.damping, sp.mass].every((x) => typeof x === "number" && Number.isFinite(x) && x > 0);
    const presetSpring = springFromPreset(sp?.preset);
    return {
      _key: typeof s?._key === "string" && s._key ? s._key : `screen${i}`,
      composition: s?.composition?._ref ? { _type: "reference", _ref: s.composition._ref, _weak: true } : null,
      trimStart: Math.max(0, Number(s?.trimStart) || 0),
      trimEnd: Math.max(0, Number(s?.trimEnd) || 0),
      transition: {
        type: (TRANSITION_TYPES as readonly string[]).includes(t.type as string) ? (t.type as TransitionType) : DEFAULT_TRANSITION.type,
        direction: (DIRECTIONS as readonly string[]).includes(t.direction as string) ? (t.direction as Direction) : "left",
        seconds: Math.min(3, Math.max(0.1, Number(t.seconds) || DEFAULT_TRANSITION.seconds)),
        spring: springOk
          ? { ...(sp?.preset ? { preset: sp.preset } : {}), stiffness: sp!.stiffness!, damping: sp!.damping!, mass: sp!.mass!, velocity: Number.isFinite(sp!.velocity) ? sp!.velocity! : 0 }
          : presetSpring ?? DEFAULT_TRANSITION.spring,
      },
    };
  });
  return { format, fps, screens };
}

/** What a screen resolves to: the composition's playable source and its title, or null if missing. */
export type ResolveScreen = (ref: string) => { source: PlayableSource; title: string } | null;

type Slot = { index: number; start: number; length: number; trimStart: number; playable: Playable | null; title: string };

/** Lay the screens on one timeline; transitions overlap the end of a screen with the start of the next. */
export function reelTimeline(reel: ReelData, resolve: ResolveScreen) {
  const fps = reel.fps;
  const slots: Slot[] = [];
  const overlaps: number[] = [];
  let at = 0;
  reel.screens.forEach((s, i) => {
    const found = s.composition?._ref ? resolve(s.composition._ref) : null;
    const playable = found ? found.source(reel.format, fps) : null;
    const natural = playable ? Math.max(1, playable.frames()) : Math.round(2 * fps);
    const trimStart = Math.min(natural - 1, Math.round(s.trimStart * fps));
    const length = Math.max(1, natural - trimStart - Math.round(s.trimEnd * fps));
    slots.push({ index: i, start: at, length, trimStart, playable, title: found?.title ?? "Missing composition" });
    const next = reel.screens[i + 1];
    let overlap = 0;
    if (next && s.transition.type !== "cut") overlap = Math.round(s.transition.seconds * fps);
    overlaps.push(overlap);
    at += length;
  });
  // Clamp overlaps so a transition never eats more than half of either screen.
  for (let i = 0; i < slots.length - 1; i++) {
    overlaps[i] = Math.min(overlaps[i], Math.floor(slots[i].length / 2), Math.floor(slots[i + 1].length / 2));
  }
  let start = 0;
  slots.forEach((slot, i) => {
    slot.start = start;
    start += slot.length - (overlaps[i] ?? 0);
  });
  const total = Math.max(1, slots.length ? slots[slots.length - 1].start + slots[slots.length - 1].length : 1);
  return { slots, overlaps, total };
}

function placeholder(ctx: Ctx2D, W: number, H: number, title: string) {
  ctx.fillStyle = colour("muted");
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = colour("cream");
  ctx.font = `${Math.round(Math.min(W, H) * 0.04)}px "Turnery", sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(title, W / 2, H / 2);
}

type Canvas2D = { canvas: OffscreenCanvas | HTMLCanvasElement; ctx: Ctx2D };
function makeCanvas(W: number, H: number): Canvas2D {
  if (typeof OffscreenCanvas !== "undefined") {
    const canvas = new OffscreenCanvas(W, H);
    return { canvas, ctx: canvas.getContext("2d")! };
  }
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  return { canvas, ctx: canvas.getContext("2d")! };
}

/** A reel as a playable source. `resolve` maps a composition id to its playable. */
export function reelSource(reel: ReelData, resolve: ResolveScreen): PlayableSource {
  return (format, fps) => {
    const r = { ...reel, format, fps };
    const { slots, overlaps, total } = reelTimeline(r, resolve);
    const [W, H] = formatSize(format);
    let buffers: [Canvas2D, Canvas2D] | null = null;

    const localFrame = (slot: Slot, frame: number) => slot.trimStart + Math.min(slot.length - 1, Math.max(0, frame - slot.start));
    const smart = (i: number) => {
      const t = reel.screens[i]?.transition;
      const a = slots[i]?.playable;
      const b = slots[i + 1]?.playable;
      return t?.type === "smart" && (overlaps[i] ?? 0) > 0 && !!a?.scene && !!b?.scene;
    };
    // Keys that glide from screen i into screen i + 1, worked out once per transition.
    const matches = new Map<number, Set<string>>();
    const matchedInto = (i: number, ctx: Ctx2D, env: DrawEnv) => {
      let m = matches.get(i);
      if (!m) {
        const a = slots[i];
        const b = slots[i + 1];
        m = matchedKeys(
          a.playable!.scene!(ctx, a.trimStart + a.length - 1, env),
          b.playable!.scene!(ctx, b.trimStart, env),
        );
        matches.set(i, m);
      }
      return m;
    };

    const drawSlot = (ctx: Ctx2D, slot: Slot, frame: number, env: DrawEnv) => {
      ctx.save();
      // A screen entered by smart animate doesn't replay the entrances of what glided in.
      const arrived = slot.index > 0 && smart(slot.index - 1) ? matchedInto(slot.index - 1, ctx, env) : undefined;
      if (slot.playable) slot.playable.draw(ctx, localFrame(slot, frame), arrived ? { ...env, arrived } : env);
      else placeholder(ctx, W, H, slot.title);
      ctx.restore();
    };

    const playable: Playable = {
      format,
      fps,
      frames: () => total,
      images: () => [...new Set(slots.flatMap((s) => s.playable?.images() ?? []))],
      // Screens that need preparing (site blocks) get the frames on screen at `frame`: both during a transition.
      prepare: slots.some((s) => s.playable?.prepare)
        ? async (rawFrame, env) => {
            const frame = ((Math.floor(rawFrame) % total) + total) % total;
            const on = slots.filter((s) => frame >= s.start && frame < s.start + s.length);
            await Promise.all(on.map((s) => s.playable?.prepare?.(localFrame(s, frame), env)));
          }
        : undefined,
      segments: (): Segment[] =>
        slots.map((s, i) => ({ start: s.start, end: i < slots.length - 1 ? slots[i + 1].start : total, label: s.title })),
      draw(ctx, rawFrame, env) {
        const frame = ((Math.floor(rawFrame) % total) + total) % total;
        if (!slots.length) return placeholder(ctx, W, H, "Add screens to this reel");
        // The latest screen that has started; if the one before it is still playing, we're in its transition.
        let i = 0;
        for (let k = 0; k < slots.length; k++) if (frame >= slots[k].start) i = k;
        const next = slots[i];
        const current = slots[i - 1];
        const overlap = current ? overlaps[current.index] ?? 0 : 0;
        if (!current || overlap <= 0 || frame >= current.start + current.length) return drawSlot(ctx, next, frame, env);

        const t = reel.screens[current.index].transition;
        const raw = (frame - next.start + 1) / overlap;
        const settle = springSettling(t.spring).seconds || 1;
        const e = Math.min(1, Math.max(0, springAt(t.spring, raw * settle)));
        if (smart(current.index)) {
          const matched = matchedInto(current.index, ctx, env);
          // The outgoing screen keeps playing under the glide; the incoming one plays its unmatched entrances.
          const a = current.playable!.scene!(ctx, localFrame(current, frame), env);
          const b = next.playable!.scene!(ctx, localFrame(next, frame), env);
          ctx.save();
          renderSmart(ctx, a, b, springAt(t.spring, raw * settle), { ...env, arrived: matched }, matched);
          ctx.restore();
          return;
        }
        buffers ??= [makeCanvas(W, H), makeCanvas(W, H)];
        const [a, b] = buffers;
        drawSlot(a.ctx, current, frame, env);
        drawSlot(b.ctx, next, frame, env);

        const dx = t.direction === "left" ? -1 : t.direction === "right" ? 1 : 0;
        const dy = t.direction === "up" ? -1 : t.direction === "down" ? 1 : 0;
        ctx.save();
        if (t.type === "crossfade" || t.type === "smart") {
          ctx.drawImage(a.canvas, 0, 0);
          ctx.globalAlpha = e;
          ctx.drawImage(b.canvas, 0, 0);
        } else if (t.type === "push") {
          ctx.drawImage(a.canvas, dx * e * W, dy * e * H);
          ctx.drawImage(b.canvas, -dx * (1 - e) * W, -dy * (1 - e) * H);
        } else {
          // slide: the next screen slides over the current one
          ctx.drawImage(a.canvas, 0, 0);
          ctx.drawImage(b.canvas, -dx * (1 - e) * W, -dy * (1 - e) * H);
        }
        ctx.restore();
      },
    };
    return playable;
  };
}
