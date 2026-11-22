// Spike: the website's request card as a 5 s video, driven frame by frame.
// The card is the site's own component (RequestCardView) with scripted props; CSS animations and
// transitions are switched off so every frame is a pure function of the frame number.
import RequestCardView from "@/components/sections/RequestCardView";
import { cities, defaultServices } from "@/components/sections/RequestCard";
import cardStyles from "@/components/sections/RequestCard.module.css";
import brand from "../../../brand.json";
import { springAt } from "../../../engine/spring";

export const CLIP = { width: 1080, height: 1350, fps: 30, seconds: 5 };
export const CLIP_FRAMES = CLIP.fps * CLIP.seconds;

const SCALE = 1.8; // the card is 360px wide on the site; step 2 is ~700px tall
const DATE = new Date(2026, 11, 12);
const NAME = "Adaeze Okafor";

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
/** Spring progress `t` seconds after `start` (0 before it). */
const after = (t: number, start: number, spring = brand.springs.card) => (t < start ? 0 : springAt(spring, t - start));

function stateAt(t: number) {
  const step2 = t >= 3.4;
  const typed = Math.max(0, Math.floor((t - 3.9) / 0.07));
  return {
    step: step2 ? (2 as const) : (1 as const),
    service: t >= 1.0 ? "Gifts & Celebrations" : "",
    when: t >= 1.7 ? ("date" as const) : ("today" as const),
    date: t >= 1.7 ? DATE : null,
    where: t >= 2.4 ? "Abuja" : "Lagos",
    pressed: t >= 3.05 && t < 3.25,
    name: NAME.slice(0, typed),
    stepIn: step2 ? after(t, 3.4, brand.springs.snappy) : 1,
  };
}

/** One frame of the clip at video size (1080 × 1350). */
export function RequestCardClip({ frame }: { frame: number }) {
  const t = frame / CLIP.fps;
  const s = stateAt(t);
  const enter = after(t, 0.15);
  const rise = (1 - enter) * brand.rise * 4;
  return (
    <div
      className="clip"
      style={
        {
          width: CLIP.width,
          height: CLIP.height,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
          background: "var(--espresso)",
          fontFamily: "var(--body)",
          fontSize: "var(--fs-body)",
          lineHeight: "var(--lh-body)",
          color: "var(--ink)",
          // globals.css builds these from next/font variables at :root; outside Next, set them here
          "--display": "Herbik, Georgia, serif",
          "--body": "Turnery, 'Helvetica Neue', Arial, sans-serif",
          "--step-a": clamp01(s.stepIn),
          "--step-y": `${(1 - s.stepIn) * 8}px`,
        } as React.CSSProperties
      }
    >
      <style>{`
        .clip *, .clip *::before, .clip *::after { animation: none !important; transition: none !important; box-sizing: border-box; }
        .clip p, .clip h2 { margin: 0; }
        .clip textarea { resize: none; }
        .clip .${cardStyles.step} { opacity: var(--step-a); transform: translateY(var(--step-y)); }
        .clip[data-pressed] button[type="submit"] { transform: scale(0.97); }
      `}</style>
      <div style={{ transform: `translateY(${rise}px) scale(${SCALE})`, opacity: clamp01(enter * 1.4) }}>
        <div data-pressed={s.pressed || undefined} className="clip" style={{ display: "contents" }}>
          <RequestCardView
            title="What can we sort?"
            services={defaultServices}
            cities={cities}
            step={s.step}
            service={s.service}
            where={s.where}
            when={s.when}
            date={s.date}
            whenLabel={s.when === "today" ? "Today (urgent)" : "Sat 12 Dec"}
            name={s.name}
          />
        </div>
      </div>
    </div>
  );
}
