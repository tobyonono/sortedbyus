// "Photo + caption": one photo filling the frame with a slow push-in (and an
// optional drift), a small label and a caption coming in over it.
import { colour, entrance, fontCss, formatSize, renderScene, uniqueKeys, wrapLines, type BaseData, type SceneElement, type Control, type EntranceValue, type Template } from "../../engine";
import spec from "./template.json";

export interface PhotoCaptionData extends BaseData {
  photo: string;
  push: number;
  drift: "none" | "left" | "right" | "up";
  overlayOpacity: number;
  caption: string;
  label: string;
  typeStyle: string;
  captionSize: number;
  place: "top" | "bottom";
  captionEntrance: EntranceValue;
  captionDelay: number;
  durationSeconds: number;
  colours: { overlay: string; text: string };
}

const defaults = spec.defaults as PhotoCaptionData;
const easeInOut = (v: number) => 0.5 - Math.cos(Math.PI * Math.min(1, Math.max(0, v))) / 2;

export const photoCaption: Template<PhotoCaptionData> = {
  id: spec.id,
  name: spec.name,
  description: spec.description,
  kind: "Photo · caption",
  defaults,
  controls: spec.controls as Control[],

  frames: (d) => Math.max(1, Math.round(d.durationSeconds * d.fps)),
  images: (d) => (d.photo ? [d.photo] : []),
  segments(d) {
    return [{ start: 0, end: this.frames(d), label: d.caption || d.label || "Photo" }];
  },

  draw(ctx, frame, d, env) {
    renderScene(ctx, this.scene!(ctx, frame, d, env), env);
  },

  scene(ctx, rawFrame, d) {
    const total = this.frames(d);
    const frame = ((Math.floor(rawFrame) % total) + total) % total;
    const t = frame / d.fps;
    const p = easeInOut(frame / Math.max(1, total - 1));
    const [W, H] = formatSize(d.format);
    const unit = Math.min(W, H);
    const full = { x: 0, y: 0, w: W, h: H };
    const out: SceneElement[] = [{ kind: "fill", key: "background", box: full, colour: colour(d.colours.overlay) }];

    // Photo: scale up by `push` over the clip, drifting a little if asked.
    if (d.photo) {
      const travel = unit * 0.04 * p;
      out.push({
        kind: "photo", key: `photo:${d.photo}`, box: full, src: d.photo,
        zoom: 1 + (d.push / 100) * p,
        dx: d.drift === "left" ? -travel : d.drift === "right" ? travel : 0,
        dy: d.drift === "up" ? -travel : 0,
      });
      out.push({ kind: "fill", key: "overlay", box: full, colour: colour(d.colours.overlay), alpha: d.overlayOpacity / 100 });
    }

    // Caption block: label above, caption below, wrapped to the frame width.
    const margin = unit * 0.08;
    const px = (d.captionSize / 100) * unit;
    const labelPx = Math.max(14, px * 0.38);
    const font = fontCss(d.typeStyle, px);
    ctx.save();
    ctx.font = font;
    const lines = d.caption ? wrapLines(ctx, d.caption, W - margin * 2) : [];
    const lineH = px * 1.12;
    const blockH = (d.label ? labelPx * 1.8 : 0) + lines.length * lineH;
    let y = d.place === "top" ? margin : H - margin - blockH;
    const since = t - d.captionDelay;
    const text = colour(d.colours.text);

    if (d.label) {
      const labelFont = fontCss("bodyMedium", labelPx);
      ctx.font = labelFont;
      const w = ctx.measureText(d.label).width;
      out.push({
        kind: "text", key: `text:${d.label}`, text: d.label, font: labelFont, px: labelPx, colour: text,
        box: { x: margin, y, w, h: labelPx },
        enter: entrance(d.captionEntrance, since),
        enterBox: { x: margin + w / 2, y: y + labelPx / 2, w: w + labelPx, h: labelPx * 1.4 },
      });
      y += labelPx * 1.8;
    }
    ctx.font = font;
    lines.forEach((line, i) => {
      const cy = y + lineH / 2 + i * lineH;
      const w = ctx.measureText(line).width;
      out.push({
        kind: "text", key: `text:${line}`, text: line, font, px, colour: text,
        box: { x: margin, y: cy - lineH / 2, w, h: lineH },
        enter: entrance(d.captionEntrance, since - (i + 1) * 0.08),
        enterBox: { x: margin + w / 2, y: cy, w: w + px * 0.2, h: lineH },
      });
    });
    ctx.restore();
    return uniqueKeys(out);
  },
};
