// "Photo mosaic": photos fill a grid tile by tile (in order or shuffled), each
// with the chosen entrance; an optional word lands over the finished grid.
import {
  colour, entrance, fontCss, formatSize, renderScene, seededOrder, springSettling, uniqueKeys,
  type BaseData, type SceneElement, type Control, type EntranceValue, type FormatKey, type Template,
} from "../../engine";
import spec from "./template.json";

export interface PhotoMosaicData extends BaseData {
  tiles: { _key: string; image: string }[];
  grid: "auto" | "2x2" | "2x3" | "3x3";
  gap: number;
  radius: number;
  word: string;
  typeStyle: string;
  typeSize: number;
  tileEntrance: EntranceValue;
  order: "inOrder" | "shuffled";
  stagger: number;
  wordEntrance: EntranceValue;
  holdSeconds: number;
  colours: { background: string; text: string };
}

const defaults = { ...spec.defaults, tiles: spec.defaults.tiles.map((t, i) => ({ _key: `tile${i + 1}`, ...t })) } as PhotoMosaicData;

/** Columns × rows: "auto" picks by shape (2×3 tall, 3×3 square, 3×2 wide). */
function gridSize(grid: PhotoMosaicData["grid"], format: FormatKey): [number, number] {
  const [W, H] = formatSize(format);
  if (grid === "2x2") return [2, 2];
  if (grid === "3x3") return [3, 3];
  if (grid === "2x3") return W > H ? [3, 2] : [2, 3];
  return W > H ? [3, 2] : W === H ? [3, 3] : [2, 3];
}

const settle = (e: EntranceValue) => (e.kind === "cut" ? 0 : springSettling(e.spring).seconds);

function timing(d: PhotoMosaicData) {
  const [cols, rows] = gridSize(d.grid, d.format);
  const cells = cols * rows;
  const built = d.stagger * (cells - 1) + settle(d.tileEntrance);
  const wordAt = built * 0.6;
  const end = Math.max(built, d.word ? wordAt + settle(d.wordEntrance) : 0) + d.holdSeconds;
  return { cols, rows, cells, wordAt, frames: Math.max(1, Math.round(end * d.fps)) };
}

export const photoMosaic: Template<PhotoMosaicData> = {
  id: spec.id,
  name: spec.name,
  description: spec.description,
  kind: "Photos · grid",
  defaults,
  controls: spec.controls as Control[],

  frames: (d) => timing(d).frames,
  images: (d) => d.tiles.map((t) => t.image).filter(Boolean),
  segments(d) {
    return [{ start: 0, end: this.frames(d), label: d.word || `${d.tiles.length} photos` }];
  },

  draw(ctx, frame, d, env) {
    renderScene(ctx, this.scene!(ctx, frame, d, env), env);
  },

  scene(ctx, rawFrame, d) {
    const { cols, rows, cells, wordAt, frames: total } = timing(d);
    const frame = ((Math.floor(rawFrame) % total) + total) % total;
    const t = frame / d.fps;
    const [W, H] = formatSize(d.format);
    const unit = Math.min(W, H);
    const gap = (d.gap / 100) * unit;
    const cw = (W - gap * (cols + 1)) / cols;
    const ch = (H - gap * (rows + 1)) / rows;
    const r = (d.radius / 100) * unit;
    const order = d.order === "shuffled" ? seededOrder(cells, cells * 7 + d.tiles.length) : [...Array(cells).keys()];
    const photos = d.tiles.map((x) => x.image).filter(Boolean);
    const out: SceneElement[] = [{ kind: "fill", key: "background", box: { x: 0, y: 0, w: W, h: H }, colour: colour(d.colours.background) }];

    for (let cell = 0; cell < cells; cell++) {
      const x = gap + (cell % cols) * (cw + gap);
      const y = gap + Math.floor(cell / cols) * (ch + gap);
      const enter = entrance(d.tileEntrance, t - order.indexOf(cell) * d.stagger);
      const box = { x, y, w: cw, h: ch };
      if (photos.length) {
        const src = photos[cell % photos.length];
        out.push({ kind: "photo", key: `photo:${src}`, box, src, radius: r, under: colour("muted"), enter });
      } else out.push({ kind: "fill", key: `tile:${cell}`, box, colour: colour("muted"), radius: r, enter });
    }

    if (d.word) {
      const px = (d.typeSize / 100) * unit;
      const font = fontCss(d.typeStyle, px);
      ctx.save();
      ctx.font = font;
      const w = ctx.measureText(d.word).width;
      ctx.restore();
      // A soft band behind the word keeps it readable on any photo.
      out.push({
        kind: "text", key: `text:${d.word}`, text: d.word, font, px, colour: colour(d.colours.text),
        box: { x: W / 2 - w / 2, y: H / 2 - px * 0.55, w, h: px * 1.1 },
        band: { colour: colour(d.colours.background), alpha: 0.72, padX: px * 0.5, padY: px * 0.25, radius: px * 0.3 },
        enter: entrance(d.wordEntrance, t - wordAt),
        enterBox: { x: W / 2, y: H / 2, w: w + px, h: px * 1.6 },
      });
    }
    return uniqueKeys(out);
  },
};
