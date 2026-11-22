// "Word roll": a column of words rolls one line at a time on a spring, the
// line at the centre highlighted, next to a fixed lead word. The list repeats,
// so the last word rolls into the first and the video loops seamlessly.
import { colour, fontCss, formatSize, springAt, springSettling, type BaseData, type Control, type SpringValue, type Template } from "../../engine";
import spec from "./template.json";

export interface WordRollData extends BaseData {
  lead: string;
  words: { _key: string; text: string }[];
  typeStyle: string;
  typeSize: number;
  lineHeight: number;
  linesAround: number;
  fadeEdges: "on" | "off";
  holdSeconds: number;
  spring: SpringValue;
  direction: "up" | "down";
  colours: { background: string; active: string; other: string };
}

const defaults = { ...spec.defaults, words: spec.defaults.words.map((w, i) => ({ _key: `word${i + 1}`, ...w })) } as WordRollData;

function timing(d: WordRollData) {
  const hold = Math.max(1, Math.round(d.holdSeconds * d.fps));
  const roll = Math.max(1, Math.round(springSettling(d.spring).seconds * d.fps));
  return { hold, roll, step: hold + roll };
}

export const wordRoll: Template<WordRollData> = {
  id: spec.id,
  name: spec.name,
  description: spec.description,
  kind: "Type · roll",
  defaults,
  controls: spec.controls as Control[],

  frames: (d) => Math.max(1, d.words.length) * timing(d).step,
  images: () => [],
  segments(d) {
    const { step } = timing(d);
    return d.words.map((w, i) => ({ start: i * step, end: (i + 1) * step, label: w.text }));
  },

  draw(ctx, rawFrame, d, env) {
    void env;
    const total = this.frames(d);
    const frame = ((Math.floor(rawFrame) % total) + total) % total;
    const { hold, roll, step } = timing(d);
    const words = d.words.map((w) => w.text).filter(Boolean);
    const n = Math.max(1, words.length);
    const [W, H] = formatSize(d.format);
    const px = (d.typeSize / 100) * Math.min(W, H);
    const lineH = px * d.lineHeight;
    const dir = d.direction === "up" ? 1 : -1;

    // Position in the list: whole steps plus the spring's progress through the current roll.
    const i = Math.floor(frame / step);
    const into = frame % step;
    const p = into < hold ? 0 : into >= hold + roll - 1 ? 1 : springAt(d.spring, (into - hold) / d.fps);
    const pos = i + p;

    ctx.save();
    ctx.fillStyle = colour(d.colours.background);
    ctx.fillRect(0, 0, W, H);
    ctx.font = fontCss(d.typeStyle, px);
    ctx.textBaseline = "middle";

    // Lead word sits to the left of the active line; with no lead the column is centred.
    const gap = px * 0.3;
    const widest = Math.max(...words.map((w) => ctx.measureText(w).width), 0);
    const leadW = d.lead ? ctx.measureText(d.lead).width : 0;
    const blockW = leadW + (d.lead ? gap : 0) + widest;
    const left = W / 2 - blockW / 2;
    const columnX = left + leadW + (d.lead ? gap : 0);
    const cy = H / 2;

    if (d.lead) {
      ctx.textAlign = "left";
      ctx.fillStyle = colour(d.colours.active);
      ctx.fillText(d.lead, left, cy);
    }

    ctx.textAlign = "left";
    const around = Math.round(d.linesAround);
    for (let j = -around - 1; j <= around + 1; j++) {
      const index = Math.floor(pos) + j;
      const word = words[((index % n) + n) % n];
      if (!word) continue;
      const offset = index - pos; // 0 = centred
      const y = cy + offset * lineH * dir;
      const dist = Math.abs(offset);
      if (dist > around + 0.5) continue;
      const fade = d.fadeEdges === "on" ? Math.max(0, 1 - dist / (around + 0.5)) : 1;
      const active = Math.max(0, 1 - dist); // blends colour as a word passes the centre
      ctx.globalAlpha = fade;
      ctx.fillStyle = active > 0.5 ? colour(d.colours.active) : colour(d.colours.other);
      ctx.fillText(word, columnX, y);
    }
    ctx.restore();
  },
};
