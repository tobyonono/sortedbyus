// "Request card": the website's request form (RequestCardView, the same component the homepage
// uses) filling itself in. Every frame renders the component with scripted props and is captured
// from HTML (../site/domFrames), so the video always matches the site's type, spacing and colour.
import type { CSSProperties } from "react";
import RequestCardView, { cities, defaultServices, shortFmt } from "@/components/sections/RequestCardView";
import cardStyles from "@/components/sections/RequestCard.module.css";
import globalsCss from "@/styles/globals.css?raw";
import motionTokensCss from "@/styles/motion-tokens.css?raw";
import { brand, colour, entrance, formatSize, springAt, type BaseData, type Control, type EntranceValue, type Template } from "../../engine";
import { DomFrames } from "../site/domFrames";
import spec from "./template.json";

export interface SiteRequestCardData extends BaseData {
  title: string;
  service: string;
  when: "today" | "date";
  date: string;
  where: string;
  name: string;
  endsOn: "details" | "contact" | "sent";
  pace: number;
  cardEntrance: EntranceValue;
  holdSeconds: number;
  colours: { background: string };
}

const CARD_W = 360; // the card's width on the site
const CARD_H = 720; // about its tallest (step 2), for fitting it to the frame

/** The site's design tokens (colours, type scale, motion), scoped to the block instead of :root. */
const rootBlock = (css: string) => css.match(/:root\s*\{([^}]*)\}/)?.[1] ?? "";
const TOKENS = rootBlock(globalsCss) + rootBlock(motionTokensCss);

/** When each beat happens, in seconds. */
function beats(d: SiteRequestCardData) {
  const p = d.pace;
  const service = 0.9;
  const when = service + p;
  const where = when + p;
  const toStep2 = where + p;
  const typeFrom = toStep2 + 0.55;
  const typed = typeFrom + d.name.length * 0.06;
  const toSent = typed + 0.5;
  const end = d.endsOn === "details" ? where + 0.6 : d.endsOn === "contact" ? typed + 0.3 : toSent + 0.5;
  return { service, when, where, toStep2, typeFrom, toSent, end: end + d.holdSeconds };
}

function parseDate(s: string) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s.trim());
  const date = m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null;
  return date && !Number.isNaN(date.getTime()) ? date : null;
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const after = (t: number, at: number) => (t < at ? 0 : springAt(brand.springs.snappy, t - at));

/** One frame of the block at video size. */
function Frame({ d, frame }: { d: SiteRequestCardData; frame: number }) {
  const [W, H] = formatSize(d.format);
  const t = frame / d.fps;
  const b = beats(d);
  const date = d.when === "date" ? parseDate(d.date) : null;
  const goesOn = d.endsOn !== "details";
  const step = goesOn && t >= b.toSent && d.endsOn === "sent" ? "sent" : goesOn && t >= b.toStep2 ? 2 : 1;
  const stepAt = step === "sent" ? b.toSent : step === 2 ? b.toStep2 : -1;
  const stepIn = stepAt < 0 ? 1 : after(t, stepAt);
  const pressed = goesOn && ((t >= b.toStep2 - 0.2 && t < b.toStep2) || (d.endsOn === "sent" && t >= b.toSent - 0.2 && t < b.toSent));
  const scale = Math.min((W * 0.78) / CARD_W, (H * 0.9) / CARD_H);
  const e = entrance(d.cardEntrance, t - 0.1);

  return (
    <div
      className="site-block"
      data-pressed={pressed || undefined}
      style={{ width: W, height: H, background: colour(d.colours.background), ["--step-a" as string]: clamp01(stepIn), ["--step-y" as string]: `${(1 - stepIn) * 8}px` } as CSSProperties}
    >
      <style>{`
        .site-block { ${TOKENS}
          --display: Herbik, Georgia, serif; --body: Turnery, "Helvetica Neue", Arial, sans-serif;
          display: flex; align-items: center; justify-content: center; overflow: hidden;
          font-family: var(--body); font-size: var(--fs-body); line-height: var(--lh-body); color: var(--ink);
          -webkit-font-smoothing: antialiased; }
        .site-block *, .site-block *::before, .site-block *::after { box-sizing: border-box; animation: none !important; transition: none !important; }
        .site-block p, .site-block h2 { margin: 0; }
        .site-block button, .site-block input, .site-block textarea { font: inherit; color: inherit; }
        .site-block textarea { resize: none; }
        .site-block .visually-hidden { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
        .site-block .link { text-decoration: underline 1px; text-underline-offset: 0.1428em; }
        .site-block .${cardStyles.step} { opacity: var(--step-a); transform: translateY(var(--step-y)); }
        .site-block[data-pressed] button[type="submit"] { transform: scale(0.97); }
      `}</style>
      <div style={{ transform: `scale(${scale})`, overflow: e.clip ? "hidden" : undefined }}>
        <div style={{ opacity: e.alpha, transform: `translateY(${e.offset * 100}%) scale(${e.scale})` }}>
          <RequestCardView
            title={d.title}
            services={defaultServices}
            cities={cities}
            step={step}
            service={t >= b.service ? d.service : ""}
            when={date && t >= b.when ? "date" : "today"}
            date={date && t >= b.when ? date : null}
            where={t >= b.where ? d.where : "Lagos"}
            whenLabel={date ? shortFmt.format(date) : "Today (urgent)"}
            name={d.name.slice(0, Math.max(0, Math.floor((t - b.typeFrom) / 0.06)))}
          />
        </div>
      </div>
    </div>
  );
}

const frames = new DomFrames(16);
const keyOf = (d: SiteRequestCardData) => `${spec.id}|${JSON.stringify(d)}|`;

export const siteRequestCard: Template<SiteRequestCardData> = {
  id: spec.id,
  name: spec.name,
  description: spec.description,
  kind: "Site · request form",
  defaults: spec.defaults as SiteRequestCardData,
  controls: spec.controls as Control[],

  frames: (d) => Math.max(1, Math.round(beats(d).end * d.fps)),
  images: () => [],
  segments(d) {
    return [{ start: 0, end: this.frames(d), label: d.service || "Request" }];
  },

  async prepare(rawFrame, d) {
    const total = this.frames(d);
    const frame = ((Math.floor(rawFrame) % total) + total) % total;
    const [W, H] = formatSize(d.format);
    await frames.capture(keyOf(d) + frame, <Frame d={d} frame={frame} />, W, H);
  },

  draw(ctx, rawFrame, d) {
    const total = this.frames(d);
    const frame = ((Math.floor(rawFrame) % total) + total) % total;
    const [W, H] = formatSize(d.format);
    ctx.fillStyle = colour(d.colours.background);
    ctx.fillRect(0, 0, W, H);
    frames.draw(ctx, keyOf(d) + frame, keyOf(d), frame, W, H);
  },
};
