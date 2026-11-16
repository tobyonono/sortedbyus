import type { TickerItem } from "./RequestTicker";
import { pic, type SanityImg } from "@/sanity/image";

/** Card sizes and offsets for the scrolling request strip, in order (they repeat if there are more cards). */
const SHAPES = [
  { w: 1, h: 230, y: 40 }, { w: 1.15, h: 300, y: 0 }, { w: 0.9, h: 250, y: 70 }, { w: 1.25, h: 220, y: 20 },
  { w: 0.95, h: 280, y: 56 }, { w: 1.1, h: 320, y: 8 }, { w: 1, h: 220, y: 84 }, { w: 1.2, h: 260, y: 30 },
  { w: 0.95, h: 300, y: 0 }, { w: 1.1, h: 240, y: 64 },
];

/** CMS examples -> ticker cards: a photo card when the editor added a photo, otherwise the next brand colour. */
export function tickerItems(examples: { label: string; text: string; image?: SanityImg }[] = [], tones: NonNullable<TickerItem["tone"]>[]): TickerItem[] {
  let t = 0;
  return examples.map((e, i) => {
    const p = pic(e.image);
    return { label: e.label, text: e.text, ...SHAPES[i % SHAPES.length], ...(p ? { img: p } : { tone: tones[t++ % tones.length] }) };
  });
}
