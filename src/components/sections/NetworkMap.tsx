"use client";

import { prefersReducedMotion } from "@/lib/motion";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { earth } from "@/lib/palette";
import m from "./NetworkMap.module.css";

/* How a request gets sorted, simply. "Your request" comes in along a dotted line to a request card: who it's
   from, where they are, when it's for and what they asked. From the card a line draws out to each kind of help
   the request needs, and a butter circle for it appears where the line lands (one, or one per category when it
   needs more). Then the answer flows back along those lines to the card, which shows "Sorted" and our reply.
   Only the circles in play are ever shown; each links to its service page. Stories take turns; with reduced
   motion it holds still on the first one, sorted. */

type P = { x: number; y: number };
type Cat = P & { label: string; title: string; slug: string };
type Layout = {
  W: number; H: number; vertical: boolean;
  /** where the dotted line starts (the "Your request" tag sits just outside it) */
  request: P;
  /** the card's box, in the drawing's units */
  card: { x: number; y: number; w: number; h: number };
  /** where the dotted line meets the card, and where the lines out to the circles leave it */
  inPort: P; outPort: P;
  ballR: number;
  /** where the i-th of n circles sits */
  slot: (i: number, n: number) => P;
};

const f = (n: number) => n.toFixed(1);
/* rounded, so the server-rendered numbers match the browser's exactly */
const r1 = (n: number) => Math.round(n * 10) / 10;
const line = (a: P, b: P) => `M${f(a.x)} ${f(a.y)}L${f(b.x)} ${f(b.y)}`;

const CATEGORIES = [
  { label: "Gifts", title: "Gifts & Celebrations", slug: "gifts-celebrations" },
  { label: "Shopping", title: "Shopping & Sourcing", slug: "shopping-sourcing" },
  { label: "Travel", title: "Travel & Holidays", slug: "travel-holidays" },
  { label: "Home", title: "Home & Lifestyle", slug: "home-lifestyle" },
  { label: "Events", title: "Events & Experiences", slug: "events-experiences" },
  { label: "Errands", title: "Errands & Admin", slug: "errands-admin" },
];

/* Wide: a full-width band. Your request comes in from the left, the circles appear on the right, one level
   with the card or stacked either side of it. */
const WIDE: Layout = (() => {
  // the card sits dead centre; the tag on the left and the circles on the right reach out the same distance
  // the drawing is trimmed to its content: the card, and three stacked circles (120 apart) reaching just past
  // its top and bottom, so the card sits close under the heading with an even gap to the points below
  const card = { x: 460, y: 28, w: 400, h: 300 };
  const outPort = { x: card.x + card.w, y: card.y + card.h / 2 };
  return {
    W: 1320, H: 356, vertical: false, request: { x: 200, y: outPort.y }, card,
    inPort: { x: card.x, y: outPort.y }, outPort, ballR: 48,
    slot: (i, n) => ({ x: 1180, y: r1(outPort.y + (i - (n - 1) / 2) * 120) }),
  };
})();

/* Tall: a phone. Your request comes in from the top, the circles appear below the card, side by side. */
const TALL: Layout = (() => {
  const card = { x: 40, y: 160, w: 920, h: 560 };
  const outPort = { x: 500, y: card.y + card.h };
  return {
    W: 1000, H: 1095, vertical: true, request: { x: 500, y: 75 }, card,
    inPort: { x: 500, y: card.y }, outPort, ballR: 96,
    slot: (i, n) => ({ x: r1(500 + (i - (n - 1) / 2) * 290), y: 960 }),
  };
})();

/* One request at a time: who asked, from where, for when, what (with the detail that matters to them), the help
   it needed (each with the category whose page it links to), and our reply, which uses that detail and says
   what happens next. Asked from home and from abroad. Written to docs/brand-voice.md. */
const STORIES: { from: string; where: string; when: string; ask: string; help: [string, string][]; reply: string }[] = [
  { from: "Tolu", where: "London", when: "Sunday", ask: "Flowers for Mum in Lekki. She loves yellow", help: [["Flowers", "Gifts"]], reply: "Sunflowers and yellow roses, with her at 10am. We’ll send a photo once she has them." },
  { from: "Adaeze", where: "Lagos", when: "In three weeks", ask: "Aso-ebi for twelve, in the bride’s green", help: [["Fabric", "Shopping"], ["Tailoring", "Shopping"]], reply: "Three fabrics in that green to choose from, and a tailor who can fit all twelve in time." },
  { from: "Emeka", where: "Houston", when: "Today", ask: "Mum’s prescription. Her usual pharmacy’s out", help: [["Pharmacy run", "Errands"]], reply: "Found at another pharmacy in Surulere and with her by 4pm. Receipt on WhatsApp." },
  { from: "Kemi", where: "Abuja", when: "Saturday", ask: "My daughter’s fifth. She loves butterflies", help: [["Cake", "Gifts"], ["Decor", "Events"], ["Catering", "Events"]], reply: "A butterfly cake, decorations to match and small chops for the parents. All set for 2pm." },
  { from: "Dayo", where: "Toronto", when: "Thursday, 6am", ask: "A driver when I land. I’ve got three cases", help: [["Airport pickup", "Travel"]], reply: "A driver with room for your cases, waiting at arrivals. His number’s on WhatsApp." },
  { from: "Funmi", where: "London", when: "In two weeks", ask: "The flat ready before I land. Nothing fussy", help: [["Painting", "Home"], ["Cleaning", "Home"], ["Furniture", "Shopping"]], reply: "Painted, cleaned and furnished by the 14th, so you can land and rest." },
  { from: "Ngozi", where: "Lagos", when: "Tomorrow", ask: "A leak at the family house. Dad’s home", help: [["Plumbing", "Home"]], reply: "A plumber at 9am who’ll call your dad first. Photos once it’s fixed." },
];


const pct = (v: number, of: number) => `${((v / of) * 100).toFixed(3)}%`;
const sec = (n: number) => `${n.toFixed(2)}s`;

/* One story, in seconds:
   0 → TRAVEL     the request travels in along the dotted line, and fills the card as it lands
   then, per category (STAGGER apart, after a short beat): its line draws out (OUT) and the circle lights
   then the answers flow back from every lit circle to the card (LEG); the card shows "Sorted" and our reply;
   it holds (HOLD), and the next story starts. */
const TRAVEL = 1;
const BEAT = 0.35;
const OUT = 0.5;
const STAGGER = 0.35;
const LEG = 0.8;
const HOLD = 3.2;
const timing = (n: number) => {
  const start = (i: number) => TRAVEL + BEAT + i * STAGGER;
  const lit = (i: number) => start(i) + OUT;
  const back = lit(n - 1) + 0.6;
  const done = back + LEG;
  return { start, lit, back, done, total: done + HOLD };
};

/* reduced motion, read the React way so the server (which can't know) and the browser agree on first paint */
const reduceQuery = "(prefers-reduced-motion: reduce)";
const subscribeReduce = (cb: () => void) => {
  const q = window.matchMedia(reduceQuery);
  q.addEventListener("change", cb);
  return () => q.removeEventListener("change", cb);
};
const useReducedMotion = () => useSyncExternalStore(subscribeReduce, () => window.matchMedia(reduceQuery).matches, () => false);

export default function NetworkMap({ bare = false, wide = false, className = "" }: { bare?: boolean; wide?: boolean; className?: string }) {
  const L = wide ? WIDE : TALL;
  const { W, H, request, card, inPort, outPort, ballR } = L;
  const intake = line(request, inPort);
  const maskId = wide ? "route-w" : "route-t";

  const still = useReducedMotion();
  const [active, setActive] = useState(0);
  const [inView, setInView] = useState(false);
  const ref = useRef<HTMLElement>(null);
  const anims = useRef<SVGGElement>(null);
  // the story whose answer is back at the card (tagged, so a new story always starts unsorted)
  const [sortedStory, setSortedStory] = useState<number | null>(null);
  const done = still || sortedStory === active;

  const story = STORIES[active];
  // only the help this request needs is drawn: each service in its slot, with its own line out from the card,
  // linking to the page for its category
  const lit: Cat[] = story.help.map(([service, catLabel], i) => {
    const cat = CATEGORIES.find((c) => c.label === catLabel)!;
    return { label: service, title: `${service}: ${cat.title}`, slug: cat.slug, ...L.slot(i, story.help.length) };
  });
  // the outer lines bow outwards a little; a single or middle one runs straight
  // straight lines from the card to each circle
  const routes = lit.map((c) => line(outPort, c));
  const t = timing(lit.length);

  // Only animate while the map is on screen, and never with reduced motion.
  useEffect(() => {
    const el = ref.current;
    if (!el || prefersReducedMotion()) return;
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { threshold: 0.25 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Each story: start its SVG animations by hand (ones added after load would count from page load and
  // already be over), show it sorted once the answer is back at the card, then move on.
  useEffect(() => {
    if (!inView) return;
    anims.current?.querySelectorAll<SVGAnimationElement>("[data-at]").forEach((a) => a.beginElementAt(Number(a.dataset.at)));
    const timers = [
      window.setTimeout(() => setSortedStory(active), t.done * 1000),
      window.setTimeout(() => setActive((a) => (a + 1) % STORIES.length), t.total * 1000),
    ];
    return () => timers.forEach((id) => window.clearTimeout(id));
  }, [active, inView, t.done, t.total]);

  const packetR = L.vertical ? 14 : 8;
  return (
    <figure
      ref={ref}
      className={`${m.wrap} ${wide ? "" : m.tall} ${inView ? m.playing : ""} ${className}`}
      aria-label="How a request gets sorted: your request comes to us with who it's for and when, we send it to the kind of help it needs, from gifts and shopping to home and events, and the answer comes back to you, sorted."
    >
      <div className={`${m.map} ${bare ? m.bare : ""}`} style={{ aspectRatio: `${W} / ${H}` }}>
        <svg viewBox={`0 0 ${W} ${H}`} className={m.svg} aria-hidden="true">
          {/* this story's lines draw out from the card to each kind of help it needs */}
          {/* dotted like your line in: the dots are revealed from the card outwards by a mask that draws along the
              line, then keep flowing towards the circle */}
          <g key={`r${active}`}>
            <defs>
              {routes.map((d, i) => (
                <mask key={i} id={`${maskId}-${i}`} maskUnits="userSpaceOnUse" x={0} y={0} width={W} height={H}>
                  <path className={m.reveal} d={d} pathLength={1} style={{ animationDelay: sec(t.start(i)), animationDuration: sec(OUT) }} />
                </mask>
              ))}
            </defs>
            {routes.map((d, i) => <path key={i} className={m.intake} d={d} mask={`url(#${maskId}-${i})`} />)}
          </g>
          {/* your message in, its dots flowing towards the card */}
          <path className={m.intake} d={intake} />
          {/* each circle appears, lit, as its line reaches it, and a soft ring swells out of it */}
          <g key={`c${active}`}>
            <g className={m.halos}>{lit.map((c, i) => <circle key={c.label} cx={c.x} cy={c.y} r={ballR} style={{ animationDelay: sec(t.lit(i)) }} />)}</g>
            <g className={m.balls}>{lit.map((c, i) => <circle key={c.label} cx={c.x} cy={c.y} r={ballR} style={{ animationDelay: sec(t.lit(i)) }} />)}</g>
          </g>
          <g key={`p${active}`} ref={anims}>
            {/* the request travelling in to the card */}
            <circle className={m.packet} r={packetR} opacity={0}>
              <animateMotion data-at={0} begin="indefinite" dur={`${TRAVEL}s`} fill="freeze" path={intake} calcMode="spline" keyTimes="0;1" keySplines="0.4 0 0.2 1" />
              <animate data-at={0} attributeName="opacity" begin="indefinite" values="1;1;0" keyTimes="0;0.85;1" dur={`${TRAVEL}s`} fill="freeze" />
            </circle>
            {/* the answers flowing back from each lit circle to the card (the paths run backwards) */}
            {lit.map((c, i) => (
              <circle key={c.label} className={m.packet} r={packetR} opacity={0}>
                <animateMotion data-at={t.back} begin="indefinite" dur={`${LEG}s`} fill="freeze" path={routes[i]} calcMode="spline" keyPoints="1;0" keyTimes="0;1" keySplines="0.4 0 0.2 1" />
                <animate data-at={t.back} attributeName="opacity" begin="indefinite" values="1;1;0" keyTimes="0;0.9;1" dur={`${LEG}s`} fill="freeze" />
              </circle>
            ))}
          </g>
        </svg>

        {/* the request card: fills as the request lands, then shows our reply once the answers are back */}
        <div
          className={m.card}
          style={{ left: pct(card.x, W), top: pct(card.y, H), width: pct(card.w, W), minHeight: pct(card.h, H) }}
          aria-hidden="true"
        >
          <div key={active} className={m.cardBody} style={{ animationDelay: sec(TRAVEL * 0.85) }}>
            <p className={m.cardMeta}>
              <span>{story.from}, {story.where}</span>
              {/* when it's for, until the answers are back: then it turns butter and reads Sorted */}
              {done ? <span className={`${m.when} ${m.whenDone}`}>Sorted</span> : <span className={m.when}>{story.when}</span>}
            </p>
            <p className={m.cardAsk}>{story.ask}</p>
            {/* the status sits on a coloured cut, the next earth colour for each request */}
            <div className={`${m.cardFoot} ${done ? m.cardFootUp : ""}`} style={{ "--cut": earth(active) } as React.CSSProperties}>
              {done ? (
                <p className={m.reply}>{story.reply}</p>
              ) : (
                <p className={m.sorting}>On it<span className={m.dots} aria-hidden="true" /></p>
              )}
            </div>
          </div>
        </div>

        {/* each circle is a link to its service page */}
        {lit.map((c, i) => (
          <a
            key={`${c.label}-${active}`}
            href={`/services/${c.slug}`}
            aria-label={c.title}
            className={m.ballLabel}
            style={{ left: pct(c.x, W), top: pct(c.y, H), width: pct(ballR * 2, W), height: pct(ballR * 2, H), animationDelay: sec(t.lit(i)) }}
          >
            {c.label}
          </a>
        ))}
        <span className={`${m.tag} ${L.vertical ? m.tagTop : m.tagLeft}`} style={{ left: pct(request.x, W), top: pct(request.y, H) }} aria-hidden="true">Your request</span>
        {!bare && <span className={m.cut} aria-hidden="true" />}
      </div>
    </figure>
  );
}
