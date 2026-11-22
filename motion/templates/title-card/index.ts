// "Title card": a few lines of type on a brand colour or a darkened photo,
// each line coming in with the chosen entrance, staggered.
import { colour, entrance, fontCss, formatSize, renderScene, uniqueKeys, type BaseData, type SceneElement, type Control, type EntranceValue, type Template } from "../../engine";
import spec from "./template.json";

export interface TitleCardData extends BaseData {
  lines: { _key: string; text: string }[];
  typeStyle: string;
  typeSize: number;
  align: "left" | "centre";
  place: "top" | "middle" | "bottom";
  lineEntrance: EntranceValue;
  stagger: number;
  durationSeconds: number;
  colours: { background: string; text: string };
  photo: string;
  overlayOpacity: number;
}

const defaults = { ...spec.defaults, lines: spec.defaults.lines.map((l, i) => ({ _key: `line${i + 1}`, ...l })) } as TitleCardData;

export const titleCard: Template<TitleCardData> = {
  id: spec.id,
  name: spec.name,
  description: spec.description,
  kind: "Type · title",
  defaults,
  controls: spec.controls as Control[],

  frames: (d) => Math.max(1, Math.round(d.durationSeconds * d.fps)),
  images: (d) => (d.photo ? [d.photo] : []),
  segments(d) {
    return [{ start: 0, end: this.frames(d), label: d.lines.map((l) => l.text).join(" ") || "Title" }];
  },

  draw(ctx, frame, d, env) {
    renderScene(ctx, this.scene!(ctx, frame, d, env), env);
  },

  scene(ctx, rawFrame, d) {
    const total = this.frames(d);
    const frame = ((Math.floor(rawFrame) % total) + total) % total;
    const t = frame / d.fps;
    const [W, H] = formatSize(d.format);
    const px = (d.typeSize / 100) * Math.min(W, H);
    const lineH = px * 1.1;
    const margin = Math.min(W, H) * 0.08;
    const full = { x: 0, y: 0, w: W, h: H };
    const out: SceneElement[] = [{ kind: "fill", key: "background", box: full, colour: colour(d.colours.background) }];
    if (d.photo) {
      out.push({ kind: "photo", key: `photo:${d.photo}`, box: full, src: d.photo });
      out.push({ kind: "fill", key: "overlay", box: full, colour: colour(d.colours.background), alpha: d.overlayOpacity / 100 });
    }

    const lines = d.lines.map((l) => l.text).filter(Boolean);
    const blockH = lines.length * lineH;
    const top = d.place === "top" ? margin + lineH / 2 : d.place === "bottom" ? H - margin - blockH + lineH / 2 : H / 2 - blockH / 2 + lineH / 2;
    const font = fontCss(d.typeStyle, px);
    ctx.save();
    ctx.font = font;
    lines.forEach((text, i) => {
      const y = top + i * lineH;
      const w = ctx.measureText(text).width;
      const x = d.align === "left" ? margin : W / 2 - w / 2;
      out.push({
        kind: "text", key: `text:${text}`, text, font, px, colour: colour(d.colours.text),
        box: { x, y: y - lineH / 2, w, h: lineH },
        enter: entrance(d.lineEntrance, t - i * d.stagger),
        enterBox: { x: x + w / 2, y, w: w + px * 0.2, h: lineH },
      });
    });
    ctx.restore();
    return uniqueKeys(out);
  },
};
