// "Card journey" in code. Mirrors the Cavalry film (Sorted-by-Us-Card-Journey.cv):
// a staggered wall of request cards; a camera holds on each featured photo
// card, pulls back, glides to the next and pushes in. The last stop returns to
// the first, so it loops. Layout and camera numbers are the Cavalry ones.
import { colour, drawCover, formatSize, settleTime, springAt, type BaseData, type Control, type Ctx2D, type SpringValue, type Template } from "../../engine";
import spec from "./template.json";

export interface Stop {
  _key: string;
  label: string;
  request: string;
  image: string;
}

export interface FillCard {
  _key: string;
  request: string;
  colour: string;
  /** Optional: a photo makes it a photo card (pill + label), like the stops. */
  image?: string;
  label?: string;
}

export interface CardJourneyData extends BaseData {
  stops: Stop[];
  fill: FillCard[];
  holdSeconds: number;
  /** The camera's glide between cards; it also sets how long the travel takes. */
  spring: SpringValue;
  zoomIn: number;
  zoomOut: number;
  colours: { background: string };
  overlayOpacity: number;
}

const withKeys = <T extends object>(list: T[], prefix: string) => list.map((x, i) => ({ _key: `${prefix}${i + 1}`, ...x }));
const defaults = {
  ...spec.defaults,
  stops: withKeys(spec.defaults.stops, "stop"),
  fill: withKeys(spec.defaults.fill, "fill"),
} as CardJourneyData;

// ---- the wall (Cavalry units, y down here) ----
const COL_X = [-2310, -1650, -990, -330, 330, 990, 1650, 2310];
const ROWS_A = [-1695, -865, -35, 795, 1625]; // columns 0, 2, 4, 6 (flipped from Cavalry's y-up)
const ROWS_B = [-1625, -795, 35, 865, 1695]; // columns 1, 3, 5, 7
const CARD_W = 500;
const CARD_H = 680;
const RADIUS = 12;

type Slot = { x: number; y: number };
const SLOTS: Slot[] = COL_X.flatMap((x, c) => (c % 2 ? ROWS_B : ROWS_A).map((y) => ({ x, y })));
const slotIndex = (x: number, y: number) => SLOTS.findIndex((s) => s.x === x && s.y === y);
// Where the camera stops, in order: the film's four, then two more spread out.
const STOP_SLOTS = [slotIndex(-330, 35), slotIndex(-1650, -795), slotIndex(1650, 795), slotIndex(1650, -1695), slotIndex(-990, 1625), slotIndex(990, 865)];

const frames = (s: number, fps: number) => Math.max(1, Math.round(s * fps));
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const easeSine = (v: number) => (1 - Math.cos(Math.PI * clamp01(v))) / 2;

// The camera pulls back for LEAD seconds, then glides on the spring; travel
// time = LEAD + the spring's settle time ("set by the spring").
const LEAD = 0.57;

function timing(d: CardJourneyData) {
  const hold = frames(d.holdSeconds, d.fps);
  const move = frames(LEAD + settleTime(d.spring), d.fps);
  return { hold, move, seg: hold + move };
}

/** Camera at a frame: centre in wall units, and zoom. Fitted to the Cavalry film. */
function camera(frame: number, d: CardJourneyData) {
  const { hold, seg } = timing(d);
  const n = Math.max(1, Math.min(d.stops.length, STOP_SLOTS.length));
  const i = Math.floor(frame / seg) % n;
  const from = SLOTS[STOP_SLOTS[i]];
  const to = SLOTS[STOP_SLOTS[(i + 1) % n]];
  const t = Math.max(0, (frame % seg) - hold) / d.fps;
  const pan = t <= LEAD ? 0 : springAt(d.spring, t - LEAD);
  const out = easeSine(t / (LEAD * 1.3)) - easeSine((Math.min(pan, 1) - 0.35) / 0.65);
  return {
    x: from.x + (to.x - from.x) * pan,
    y: from.y + (to.y - from.y) * pan,
    zoom: d.zoomIn - (d.zoomIn - d.zoomOut) * out,
  };
}

function luminance(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => v / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function roundRect(ctx: Ctx2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

function wrap(ctx: Ctx2D, text: string, max: number) {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(/\s+/)) {
    const next = line ? `${line} ${word}` : word;
    if (line && ctx.measureText(next).width > max) {
      lines.push(line);
      line = word;
    } else line = next;
  }
  if (line) lines.push(line);
  return lines;
}

function textBlock(ctx: Ctx2D, text: string, cx: number, cy: number, max: number, size: number, leading: number) {
  ctx.font = `${size}px Herbik, Georgia, serif`;
  const lines = wrap(ctx, text, max);
  const top = cy - ((lines.length - 1) * size * leading) / 2;
  lines.forEach((l, i) => ctx.fillText(l, cx, top + i * size * leading));
}

const quote = (s: string) => `“${s.replace(/^[“"]|[”"]$/g, "")}”`;

export const cardJourney: Template<CardJourneyData> = {
  id: spec.id,
  name: spec.name,
  description: spec.description,
  kind: "Camera · wall of cards",
  defaults,
  controls: spec.controls as Control[],

  frames(d) {
    const n = Math.max(1, Math.min(d.stops.length, STOP_SLOTS.length));
    return n * timing(d).seg;
  },

  images(d) {
    return [...d.stops.map((s) => s.image), ...d.fill.map((f) => f.image ?? "")].filter(Boolean);
  },

  segments(d) {
    const { seg } = timing(d);
    return d.stops.slice(0, STOP_SLOTS.length).map((s, i) => ({ start: i * seg, end: (i + 1) * seg, label: s.label || s.request }));
  },

  draw(ctx, rawFrame, d, env) {
    const total = this.frames(d);
    const frame = ((Math.floor(rawFrame) % total) + total) % total;
    const [W, H] = formatSize(d.format);
    const k = Math.min(W, H) / 1080;
    const cam = camera(frame, d);
    const s = cam.zoom * k;

    ctx.save();
    ctx.fillStyle = colour(d.colours.background);
    ctx.fillRect(0, 0, W, H);
    ctx.translate(W / 2, H / 2);
    ctx.scale(s, s);
    ctx.translate(-cam.x, -cam.y);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    // Visible area in wall units, for skipping off-screen cards.
    const halfW = W / 2 / s + CARD_W;
    const halfH = H / 2 / s + CARD_H;

    const stopAt = new Map<number, Stop>();
    d.stops.slice(0, STOP_SLOTS.length).forEach((st, i) => stopAt.set(STOP_SLOTS[i], st));
    let fillIndex = 0;

    SLOTS.forEach((slot, si) => {
      const stop = stopAt.get(si);
      const fill = stop ? null : d.fill.length ? d.fill[fillIndex++ % d.fill.length] : null;
      if (Math.abs(slot.x - cam.x) > halfW || Math.abs(slot.y - cam.y) > halfH) return;
      const x = slot.x - CARD_W / 2;
      const y = slot.y - CARD_H / 2;

      const photoCard = stop ?? (fill?.image ? fill : null);
      if (photoCard) {
        ctx.save();
        roundRect(ctx, x, y, CARD_W, CARD_H, RADIUS);
        ctx.clip();
        ctx.fillStyle = "#646464";
        ctx.fillRect(x, y, CARD_W, CARD_H);
        const img = photoCard.image ? env.image(photoCard.image) : null;
        if (img) drawCover(ctx, img, x, y, CARD_W, CARD_H);
        ctx.globalAlpha = d.overlayOpacity / 100;
        ctx.fillStyle = colour("espresso");
        ctx.fillRect(x, y, CARD_W, CARD_H);
        ctx.restore();
        // request pill
        roundRect(ctx, slot.x - 228, slot.y - 58, 456, 116, RADIUS);
        ctx.fillStyle = colour("cream");
        ctx.fill();
        ctx.fillStyle = colour("espresso");
        textBlock(ctx, quote(photoCard.request), slot.x, slot.y, 432, 31, 1.25);
      } else if (fill) {
        const bg = colour(fill.colour);
        roundRect(ctx, x, y, CARD_W, CARD_H, RADIUS);
        ctx.fillStyle = bg;
        ctx.fill();
        ctx.fillStyle = luminance(bg) < 0.35 ? colour("cream") : colour("espresso");
        textBlock(ctx, quote(fill.request), slot.x, slot.y, 410, 48, 1.2);
      }
      // category label above the card
      const label = (stop ?? fill)?.label;
      if (label) {
        ctx.fillStyle = colour("cream");
        ctx.font = "26px Herbik, Georgia, serif";
        ctx.fillText(label, slot.x, y - 34);
      }
    });
    ctx.restore();
  },
};
