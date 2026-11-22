// "Sort flash" in code. Mirrors the Cavalry film (Sorted-by-Us-Film.cv):
// "Sort" holds while requests cut past on photos, then "ed" joins it and
// "by Us" lands. Positions are the Cavalry ones, scaled with the type size.
import { colour, drawCover, entrance, fontCss, formatSize, withEntrance, type BaseData, type Control, type EntranceValue, type Template } from "../../engine";
import spec from "./template.json";

export interface Beat {
  _key: string;
  word: string;
  image: string;
}

export interface SortFlashData extends BaseData {
  lead: string;
  suffix: string;
  closer: string;
  beats: Beat[];
  beatSeconds: number;
  endSeconds: number;
  typeSize: number;
  colours: { background: string; text: string; overlay: string };
  overlayOpacity: number;
  /** Brand type style for all the words (motion/brand.json `type`). */
  typeStyle: string;
  /** How each request and the ending come in: cut (like the film), fade, rise, scale or mask. */
  wordEntrance: EntranceValue;
}

const defaults = {
  ...spec.defaults,
  beats: spec.defaults.beats.map((b, i) => ({ _key: `beat${i + 1}`, ...b })),
} as SortFlashData;

// Cavalry layout at 120px type in a 1080-wide comp (y up there, down here).
const CAV = { size: 120, lead: [-2.1, -70], word: [0.9, 70.5], suffix: [167.4, -70], closer: [2.5, 60.8] };

function beatFrames(d: SortFlashData) {
  return Math.max(1, Math.round(d.beatSeconds * d.fps));
}

export const sortFlash: Template<SortFlashData> = {
  id: spec.id,
  name: spec.name,
  description: spec.description,
  kind: "Flash · text + photos",
  defaults,
  controls: spec.controls as Control[],

  // Before entrances, Sort flash had `wordMotion: "cut" | "rise"` + `wordSpring`.
  migrate(raw) {
    if (raw.wordEntrance || !raw.wordMotion) return raw;
    return { ...raw, wordEntrance: { kind: raw.wordMotion === "rise" ? "rise" : "cut", spring: raw.wordSpring } };
  },

  frames(d) {
    return d.beats.length * beatFrames(d) + Math.max(1, Math.round(d.endSeconds * d.fps));
  },

  images(d) {
    return d.beats.map((b) => b.image).filter(Boolean);
  },

  segments(d) {
    const beat = beatFrames(d);
    const land = d.beats.length * beat;
    return [
      ...d.beats.map((b, i) => ({ start: i * beat, end: (i + 1) * beat, label: b.word })),
      { start: land, end: this.frames(d), label: `${d.lead}${d.suffix} ${d.closer}` },
    ];
  },

  draw(ctx, rawFrame, d, env) {
    const total = this.frames(d);
    const frame = ((Math.floor(rawFrame) % total) + total) % total;
    const [W, H] = formatSize(d.format);
    const beat = beatFrames(d);
    const land = d.beats.length * beat;
    const px = (d.typeSize / 100) * Math.min(W, H);
    const k = px / CAV.size;
    const cx = W / 2;
    const cy = H / 2;

    ctx.save();
    ctx.fillStyle = colour(d.colours.background);
    ctx.fillRect(0, 0, W, H);

    if (frame < land) {
      const b = d.beats[Math.floor(frame / beat)];
      const img = b?.image ? env.image(b.image) : null;
      if (img) {
        drawCover(ctx, img, 0, 0, W, H);
        ctx.globalAlpha = d.overlayOpacity / 100;
        ctx.fillStyle = colour(d.colours.overlay);
        ctx.fillRect(0, 0, W, H);
        ctx.globalAlpha = 1;
      }
    }

    ctx.fillStyle = colour(d.colours.text);
    ctx.font = fontCss(d.typeStyle, px);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const text = (s: string, [x, y]: number[], since = -1) => {
      // since = frames since this text appeared; -1 = always there (no motion)
      const at = { x: cx + x * k, y: cy + y * k };
      if (since < 0) return ctx.fillText(s, at.x, at.y);
      const box = { ...at, w: ctx.measureText(s).width + px * 0.2, h: px * 1.25 };
      withEntrance(ctx, entrance(d.wordEntrance, since / d.fps), box, () => ctx.fillText(s, at.x, at.y));
    };

    text(d.lead, CAV.lead);
    if (frame < land) {
      const b = d.beats[Math.floor(frame / beat)];
      if (b) text(b.word, CAV.word, frame % beat);
    } else {
      text(d.suffix, CAV.suffix, frame - land);
      text(d.closer, CAV.closer, frame - land);
    }
    ctx.restore();
  },
};
