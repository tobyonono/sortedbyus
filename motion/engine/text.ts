// Text helpers shared by templates.
import type { Ctx2D } from "./index";

/** Break text into lines no wider than `max` with the context's current font. */
export function wrapLines(ctx: Ctx2D, text: string, max: number): string[] {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const next = line ? `${line} ${word}` : word;
    if (line && ctx.measureText(next).width > max) {
      lines.push(line);
      line = word;
    } else line = next;
  }
  if (line) lines.push(line);
  return lines;
}

/** Deterministic shuffle (same seed → same order), for "random" orders that don't flicker. */
export function seededOrder(count: number, seed: number): number[] {
  const order = Array.from({ length: count }, (_, i) => i);
  let s = seed || 1;
  for (let i = count - 1; i > 0; i--) {
    s = (s * 16807) % 2147483647;
    const j = s % (i + 1);
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
}
