// Shared animation types for anything that appears on screen (a word, a line,
// a card, a photo). Each runs on a brand spring, so every template moves with
// the same feel and a template only says *what* enters and *when*.
import { springAt, type Spring } from "./spring";
import type { Ctx2D } from "./index";

export const ENTRANCE_KINDS = ["cut", "fade", "rise", "scale", "mask"] as const;
export type EntranceKind = (typeof ENTRANCE_KINDS)[number];
export const ENTRANCE_LABELS: Record<EntranceKind, string> = { cut: "Cut", fade: "Fade", rise: "Rise", scale: "Scale", mask: "Mask" };

export interface EntranceValue {
  kind: EntranceKind;
  spring: Spring & { preset?: string };
}

export interface EntranceState {
  /** 0 → 1 (may overshoot with a bouncy spring). */
  progress: number;
  alpha: number;
  /** Fraction of the element's height still to travel up (rise, mask). */
  offset: number;
  scale: number;
  /** Mask only: clip to the element's box while it slides in. */
  clip: boolean;
}

/** Where an entrance is `seconds` after the element appears (negative = not yet). */
export function entrance(e: EntranceValue | undefined, seconds: number): EntranceState {
  const kind = e?.kind ?? "cut";
  if (seconds < 0) return { progress: 0, alpha: 0, offset: 0, scale: 1, clip: false };
  if (kind === "cut" || !e) return { progress: 1, alpha: 1, offset: 0, scale: 1, clip: false };
  const p = springAt(e.spring, seconds);
  const a = Math.min(1, Math.max(0, p * 1.4));
  switch (kind) {
    case "fade":
      return { progress: p, alpha: Math.min(1, Math.max(0, p)), offset: 0, scale: 1, clip: false };
    case "rise":
      return { progress: p, alpha: a, offset: (1 - p) * 0.35, scale: 1, clip: false };
    case "scale":
      return { progress: p, alpha: a, offset: 0, scale: 0.9 + 0.1 * p, clip: false };
    case "mask":
      return { progress: p, alpha: 1, offset: 1 - p, scale: 1, clip: true };
  }
}

/**
 * Draw something with an entrance applied. `box` is the element's centre and
 * size in canvas units; `draw` paints it at its final position.
 */
export function withEntrance(ctx: Ctx2D, state: EntranceState, box: { x: number; y: number; w: number; h: number }, draw: () => void) {
  if (state.alpha <= 0) return;
  ctx.save();
  if (state.clip) {
    ctx.beginPath();
    ctx.rect(box.x - box.w / 2, box.y - box.h / 2, box.w, box.h);
    ctx.clip();
  }
  ctx.globalAlpha *= state.alpha;
  ctx.translate(box.x, box.y + state.offset * box.h);
  ctx.scale(state.scale, state.scale);
  ctx.translate(-box.x, -box.y);
  draw();
  ctx.restore();
}
