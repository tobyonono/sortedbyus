// Motion engine: brand tokens + the Template contract every composition follows.
// Templates draw one frame at a time onto a 2D canvas, so the same code drives
// the live preview and the MP4 export. No framework code in here.
import brandJson from "../brand.json";
import type { Spring } from "./spring";

export * from "./spring";

export const brand = brandJson;
export type ColourName = keyof typeof brand.palette;
export type FormatKey = keyof typeof brand.formats;
export const FORMAT_KEYS = Object.keys(brand.formats) as FormatKey[];
export const FPS_OPTIONS = brand.fps;

export function colour(name: string): string {
  const hex = (brand.palette as Record<string, string>)[name];
  if (!hex) throw new Error(`Not a brand colour: ${name}`);
  return hex;
}

export function formatSize(key: FormatKey): [number, number] {
  const [w, h] = brand.formats[key].video;
  return [w, h];
}

export function aspectLabel(key: FormatKey): string {
  const [w, h] = formatSize(key);
  const g = (a: number, b: number): number => (b ? g(b, a % b) : a);
  const d = g(w, h);
  return `${w / d}:${h / d}`;
}

/** A field the studio shows in its controls panel. `key` is a dotted path into the data. */
export type Control =
  | { key: string; type: "text"; label: string; group: string }
  | { key: string; type: "number"; label: string; group: string; unit?: string; min: number; max: number; step: number }
  | { key: string; type: "colour"; label: string; group: string }
  | { key: string; type: "format" | "fps"; label: string; group: string }
  | { key: string; type: "spring"; label: string; group: string; hint?: string }
  | { key: string; type: "choice"; label: string; group: string; options: { value: string; label: string }[] }
  | { key: string; type: "list"; label: string; group: string; max: number; item: { key: string; type: "text" | "image" | "colour"; label: string }[] };

export type Ctx2D = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

export interface DrawEnv {
  width: number;
  height: number;
  fps: number;
  /** Loaded image for a template image value, or null while it loads. */
  image: (src: string) => CanvasImageSource | null;
}

export interface Segment {
  start: number;
  end: number;
  label: string;
}

/** Data every template carries, whatever else it has. */
export interface BaseData {
  format: FormatKey;
  fps: number;
}

export interface Template<D extends BaseData = BaseData> {
  id: string;
  name: string;
  description: string;
  kind: string;
  defaults: D;
  controls: Control[];
  /** Total frames for one loop. */
  frames(data: D): number;
  /** Image values the template will draw, so they can be loaded before export. */
  images(data: D): string[];
  /** Timeline sections for the scrubber. */
  segments(data: D): Segment[];
  draw(ctx: Ctx2D, frame: number, data: D, env: DrawEnv): void;
}

/** Draw an image to fill a box, cropping the overflow (CSS object-fit: cover). */
export function drawCover(ctx: Ctx2D, img: CanvasImageSource, x: number, y: number, w: number, h: number) {
  const iw = (img as HTMLImageElement).naturalWidth || (img as { width: number }).width;
  const ih = (img as HTMLImageElement).naturalHeight || (img as { height: number }).height;
  if (!iw || !ih) return;
  const s = Math.max(w / iw, h / ih);
  const dw = iw * s;
  const dh = ih * s;
  ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
}

export function get(obj: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((o, k) => (o == null ? o : (o as Record<string, unknown>)[k]), obj);
}

export function set<T>(obj: T, path: string, value: unknown): T {
  const [head, ...rest] = path.split(".");
  const src = (obj ?? {}) as Record<string, unknown>;
  return { ...src, [head]: rest.length ? set(src[head], rest.join("."), value) : value } as T;
}

/** A spring as stored in composition data: the numbers, plus the brand preset it came from (if any). */
export type SpringValue = Spring & { preset?: string };
export type SpringPresetKey = keyof typeof brand.springs;

export function springPreset(key: string): SpringValue {
  const p = (brand.springs as Record<string, Spring & { label: string }>)[key] ?? brand.springs.card;
  return { preset: key, stiffness: p.stiffness, damping: p.damping, mass: p.mass, velocity: p.velocity };
}

/** Where a template's data lives on a composition document, e.g. "sort-flash" → "sortFlash". */
export function templateField(id: string) {
  return id.replace(/-(\w)/g, (_, c: string) => c.toUpperCase());
}

/**
 * Make any stored data safe to draw: fill missing fields from the template's
 * defaults, swap anything off-brand (unknown colours, formats, presets) for the
 * default, clamp numbers to their range and cut lists to their maximum.
 * Agents write compositions through Sanity's API, so the studio never trusts them.
 */
export function normalise<D extends BaseData>(t: Template<D>, raw: unknown): D {
  let d = { ...t.defaults, ...((raw && typeof raw === "object" ? raw : {}) as object) } as D;
  const palette = brand.palette as Record<string, string>;
  for (const c of t.controls) {
    const v = get(d, c.key) as unknown;
    const def = get(t.defaults, c.key);
    const put = (value: unknown) => (d = set(d, c.key, value));
    switch (c.type) {
      case "text":
        if (typeof v !== "string") put(def ?? "");
        break;
      case "number": {
        const n = Number(v);
        put(Number.isFinite(n) && v !== null && v !== "" ? Math.min(c.max, Math.max(c.min, n)) : def);
        break;
      }
      case "colour":
        if (typeof v !== "string" || !(v in palette)) put(def);
        break;
      case "choice":
        if (!c.options.some((o) => o.value === v)) put(def);
        break;
      case "format":
        if (typeof v !== "string" || !(v in brand.formats)) put(def);
        break;
      case "fps":
        if (!brand.fps.includes(v as number)) put(def);
        break;
      case "spring": {
        const s = v as Partial<SpringValue> | undefined;
        const ok = s && [s.stiffness, s.damping, s.mass].every((x) => typeof x === "number" && x > 0);
        if (!ok) put(s?.preset && s.preset in brand.springs ? springPreset(s.preset) : def);
        else put({ ...s, velocity: Number.isFinite(s.velocity) ? s.velocity : 0 });
        break;
      }
      case "list": {
        const source = Array.isArray(v) && v.length ? v : (def as unknown[]);
        put(
          source.slice(0, c.max).map((it, i) => {
            const item = (it && typeof it === "object" ? it : {}) as Record<string, unknown>;
            const out: Record<string, string> = { _key: typeof item._key === "string" && item._key ? item._key : `item${i}` };
            for (const f of c.item) {
              const fv = item[f.key];
              out[f.key] = f.type === "colour" ? (typeof fv === "string" && fv in palette ? fv : "cream") : typeof fv === "string" ? fv : "";
            }
            return out;
          }),
        );
        break;
      }
    }
  }
  return d;
}
