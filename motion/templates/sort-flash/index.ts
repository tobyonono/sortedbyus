// "Sort flash" in code. Mirrors the Cavalry film (Sorted-by-Us-Film.cv):
// "Sort" holds while requests cut past on photos, then "ed" joins it and
// "by Us" lands. Positions are the Cavalry ones, scaled with the type size.
import { brand, colour, drawCover, formatSize, springAt, type BaseData, type Control, type SpringValue, type Template } from "../../engine";
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
  /** "cut" = hard cuts like the film; "rise" = each word rises in on the spring. */
  wordMotion: "cut" | "rise";
  wordSpring: SpringValue;
}

const defaults = {
  ...spec.defaults,
  beats: spec.defaults.beats.map((b, i) => ({ _key: `beat${i + 1}`, ...b })),
} as SortFlashData;

// Cavalry layout at 120px type in a 1080-wide comp (y up there, down here).
const CAV = { size: 120, lead: [-2.1, -70], word: [0.9, 70.5], suffix: [167.4, -70], closer: [2.5, 60.8] };

// How far a rising word travels, as a share of the type size (the site's --rise is 16px on ~56px headings).
const RISE = brand.rise / 56;

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
    ctx.font = `${px}px Herbik, Georgia, serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const text = (s: string, [x, y]: number[], since = -1) => {
      // since = frames since this text appeared; -1 = always there (no motion)
      if (d.wordMotion !== "rise" || since < 0) return ctx.fillText(s, cx + x * k, cy + y * k);
      const p = springAt(d.wordSpring, since / d.fps);
      ctx.save();
      ctx.globalAlpha = Math.min(1, Math.max(0, p * 1.4));
      ctx.fillText(s, cx + x * k, cy + y * k + (1 - p) * RISE * px);
      ctx.restore();
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
