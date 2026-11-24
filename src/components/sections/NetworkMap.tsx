"use client";

import { prefersReducedMotion } from "@/lib/motion";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import m from "./NetworkMap.module.css";

/* A map of how a request gets sorted, drawn as a ring. "Your request" comes in from the side as one dotted
   line to Sorted by Us in the middle. Around us sit the six things we sort as balls on a ring, each joined
   to us by a main branch that curves gently and slowly sways; from each ball, thinner straight offshoots run
   out to the people we use for it (florist, baker, plumber and so on). Each ball links to its service page.
   Every few seconds one story plays, all in butter: the request travels in, its route draws out through the
   category to one or more people (each lighting as the route reaches it), the answer travels back to you
   and the tag reads Sorted.
   With reduced motion it holds still on the first story. */

type P = { x: number; y: number };
type Side = "left" | "right" | "above" | "below";
type Supplier = P & { label: string; side: Side };
type Group = P & { label: string; title: string; slug: string; suppliers: Supplier[] };
type Layout = { W: number; H: number; request: P; hub: P; vertical: boolean; ring: { rx: number; ry: number }; ballR: number; groups: Group[] };

const f = (n: number) => n.toFixed(1);
const line = (...pts: P[]) => pts.map((p, i) => `${i ? "L" : "M"}${f(p.x)} ${f(p.y)}`).join("");

/* The six services, with the short name shown in the ball and who we use for each. Order = order round the ring. */
const CATEGORIES: { label: string; title: string; slug: string; trades: string[] }[] = [
  { label: "Gifts", title: "Gifts & Celebrations", slug: "gifts-celebrations", trades: ["Florist", "Baker", "Hamper maker"] },
  { label: "Shopping", title: "Shopping & Sourcing", slug: "shopping-sourcing", trades: ["Tailor", "Market trader", "Furniture maker", "Phone repairer"] },
  { label: "Travel", title: "Travel & Holidays", slug: "travel-holidays", trades: ["Hotel", "Driver", "Travel agent"] },
  { label: "Home", title: "Home & Lifestyle", slug: "home-lifestyle", trades: ["Plumber", "Painter", "Electrician", "Cleaner"] },
  { label: "Events", title: "Events & Experiences", slug: "events-experiences", trades: ["Caterer", "Chef", "Decorator", "DJ"] },
  { label: "Errands", title: "Errands & Admin", slug: "errands-admin", trades: ["Courier", "Pharmacist", "Licensing agent"] },
];

const deg = Math.PI / 180;
/* rounded, so the server-rendered numbers match the browser's exactly */
const r1 = (n: number) => Math.round(n * 10) / 10;
/** Labels sit on the outside of each person's dot, whichever way the offshoot points. */
const sideOf = (a: number): Side => {
  const c = Math.cos(a), s = Math.sin(a);
  if (c < -0.35) return "left";
  if (c > 0.35) return "right";
  return s > 0 ? "below" : "above";
};

/**
 * Six balls round the hub, spaced 54° apart, leaving a 90° gap where your request comes in (`gap`, in degrees:
 * 180 = from the left, -90 = from the top). Each ball's people fan out beyond it, alternating near and far.
 */
function radial(o: { W: number; H: number; hub: P; request: P; vertical: boolean; gap: number; ring: { rx: number; ry: number }; reach: { rx: number; ry: number }; ballR: number; fan: number }): Layout {
  const groups = CATEGORIES.map((cat, k) => {
    const a = (o.gap + 45 + k * 54) * deg;
    const g = { label: cat.label, title: cat.title, slug: cat.slug, x: r1(o.hub.x + o.ring.rx * Math.cos(a)), y: r1(o.hub.y + o.ring.ry * Math.sin(a)) };
    const n = cat.trades.length;
    const suppliers = cat.trades.map((label, i) => {
      const b = a + (i - (n - 1) / 2) * o.fan * deg;
      // near and far alternate, starting the other way round on every other ball, so neighbours' ends don't meet
      const k2 = (i + k) % 2 ? 1.1 : 1;
      return { label, x: r1(o.hub.x + o.reach.rx * k2 * Math.cos(b)), y: r1(o.hub.y + o.reach.ry * k2 * Math.sin(b)), side: sideOf(b) };
    });
    return { ...g, suppliers };
  });
  return { W: o.W, H: o.H, request: o.request, hub: o.hub, vertical: o.vertical, ring: o.ring, ballR: o.ballR, groups };
}

/* Wide: a full-width band, your request coming in from the left. */
const WIDE = radial({
  W: 1600, H: 1000, hub: { x: 820, y: 500 }, request: { x: 150, y: 500 }, vertical: false, gap: 180,
  ring: { rx: 330, ry: 270 }, reach: { rx: 540, ry: 390 }, ballR: 62, fan: 15,
});

/* Tall: a phone. Your request comes in from the top. */
const TALL = radial({
  W: 1000, H: 1250, hub: { x: 500, y: 680 }, request: { x: 500, y: 70 }, vertical: true, gap: -90,
  ring: { rx: 270, ry: 290 }, reach: { rx: 380, ry: 470 }, ballR: 92, fan: 17,
});

/* One story at a time: what was asked, and who sorted it. Real places, and people asking from home and from
   abroad. No two stories in a row use the same ball. */
const STORIES = [
  { who: ["Florist"], ask: "Flowers for Mum in Lekki on Sunday. I’m in London" },
  { who: ["Tailor", "Market trader"], ask: "Aso-ebi for twelve before the wedding" },
  { who: ["Driver"], ask: "A driver at the airport when I land" },
  /* some requests need more than one person */
  { who: ["Baker", "Decorator", "Chef"], ask: "My daughter’s fifth birthday party" },
  { who: ["Pharmacist", "Courier"], ask: "Mum’s prescription to Surulere. I’m in Houston" },
  { who: ["Painter", "Electrician", "Cleaner"], ask: "The new flat ready before I fly in" },
  { who: ["Caterer"], ask: "Small chops for forty on Saturday" },
  { who: ["Hotel"], ask: "Three quiet nights in Abuja" },
  { who: ["Plumber"], ask: "A leak fixed at the family house" },
];

/* A main branch: a gentle S-curve from us to the ball (control points pushed either side of the straight
   line, like the turns in the logo). It sways between a fuller and a flatter curve; the story's packets ride
   the in-between shape, so they never sit more than a few pixels off the line. */
type Branch = { d1: string; d2: string; mid: string; dur: string };
function curve(a: P, b: P, bend: number) {
  const dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy);
  const nx = -dy / len, ny = dx / len, A = len * 0.16 * bend;
  const c1 = { x: a.x + dx / 3 + nx * A, y: a.y + dy / 3 + ny * A };
  const c2 = { x: a.x + (2 * dx) / 3 - nx * A, y: a.y + (2 * dy) / 3 - ny * A };
  return `M${f(a.x)} ${f(a.y)}C${f(c1.x)} ${f(c1.y)} ${f(c2.x)} ${f(c2.y)} ${f(b.x)} ${f(b.y)}`;
}
const branchTo = (hub: P, g: P, k: number): Branch => {
  const s = k % 2 ? 1 : -1;
  return { d1: curve(hub, g, s), d2: curve(hub, g, s * 0.4), mid: curve(hub, g, s * 0.7), dur: `${7 + (k % 3) * 1.4}s` };
};
const SWAY = "0.45 0 0.55 1;0.45 0 0.55 1";

function build(L: Layout) {
  const { hub, groups } = L;
  const branches = groups.map((g, k) => branchTo(hub, g, k));
  const offshoots = groups.flatMap((g) => g.suppliers.map((s) => line(g, s)));
  const intake = line(L.request, hub);
  const all = groups.flatMap((g) => g.suppliers.map((s) => ({ s, g })));
  const stories = STORIES.map((st) => {
    const hits = st.who.map((w) => all.find((a) => a.s.label === w)!);
    return {
      ...st,
      suppliers: hits.map((h) => h.s),
      groups: hits.map((h) => h.g),
      branches: hits.map((h) => branches[groups.indexOf(h.g)]),
      offs: hits.map((h) => line(h.g, h.s)),
      paths: hits.map((h) => `${branches[groups.indexOf(h.g)].mid}L${f(h.s.x)} ${f(h.s.y)}`),
    };
  });
  return { branches, offshoots, intake, stories };
}

const pct = (v: number, of: number) => `${((v / of) * 100).toFixed(3)}%`;
/* One story, in seconds. Each thing lights only when the request reaches it:
   0 → TRAVEL       the request travels in along the dotted line to us
   then, per person (STAGGER apart): the main branch draws out to the category (BRANCH), the ball lights;
   the offshoot draws on to the person (OFF), the person lights and their name shows in the caption
   then the answers travel back from every person to us (LEG), then one travels back to you (LEG);
   "Sorted" shows, it holds (HOLD), and the next story starts. */
const TRAVEL = 1;
const BRANCH = 0.45;
const OFF = 0.45;
const STAGGER = 0.45;
const LEG = 0.8;
const HOLD = 2.2;
const timing = (n: number) => {
  const start = (i: number) => TRAVEL + i * STAGGER;
  const back = start(n - 1) + BRANCH + OFF + 0.4;
  const done = back + LEG * 2;
  return { start, ball: (i: number) => start(i) + BRANCH, person: (i: number) => start(i) + BRANCH + OFF, back, done, total: done + HOLD };
};
const sec = (n: number) => `${n.toFixed(2)}s`;

/* reduced motion, read the React way so the server (which can't know) and the browser agree on first paint */
const reduceQuery = "(prefers-reduced-motion: reduce)";
const subscribeReduce = (cb: () => void) => {
  const q = window.matchMedia(reduceQuery);
  q.addEventListener("change", cb);
  return () => q.removeEventListener("change", cb);
};
const useReducedMotion = () => useSyncExternalStore(subscribeReduce, () => window.matchMedia(reduceQuery).matches, () => false);

/** A main branch path, swaying unless motion is reduced. Every copy starts at page time 0, so the lit copy
    drawn over it sways in step. */
function BranchPath({ b, still, ...rest }: { b: Branch; still: boolean } & React.SVGProps<SVGPathElement>) {
  return (
    <path d={b.d1} {...rest}>
      {!still && <animate attributeName="d" values={`${b.d1};${b.d2};${b.d1}`} dur={b.dur} begin="0s" repeatCount="indefinite" calcMode="spline" keyTimes="0;0.5;1" keySplines={SWAY} />}
    </path>
  );
}

export default function NetworkMap({ bare = false, wide = false, className = "" }: { bare?: boolean; wide?: boolean; className?: string }) {
  const L = wide ? WIDE : TALL;
  const { W, H, request, hub, groups, ring, ballR } = L;
  const { branches, offshoots, intake, stories } = build(L);
  const still = useReducedMotion();
  const [active, setActive] = useState(0);
  const [inView, setInView] = useState(false);
  const ref = useRef<HTMLElement>(null);
  const anims = useRef<SVGGElement>(null);
  // how far the current story has got on its way back: "person" once the answer leaves the person,
  // "home" once it's travelling along the dotted line to you, "sorted" once it's arrived. Tagged with the
  // story's index, so a new story always starts on its way out.
  const [phase, setPhase] = useState<{ story: number; at: "person" | "home" | "sorted" } | null>(null);
  const at = phase?.story === active ? phase.at : "out";
  const home = at === "home" || at === "sorted";
  const done = at === "sorted";
  const t = timing(stories[active].paths.length);

  // Only animate while the map is on screen, and never with reduced motion.
  useEffect(() => {
    const el = ref.current;
    if (!el || prefersReducedMotion()) return;
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { threshold: 0.25 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Each story: start its SVG animations by hand (ones added after load would count from page load and
  // already be over), mark it sorted once the answer is back with you, then move on to the next.
  useEffect(() => {
    if (!inView) return;
    anims.current?.querySelectorAll<SVGAnimationElement>("[data-at]").forEach((a) => a.beginElementAt(Number(a.dataset.at)));
    const timers = [
      window.setTimeout(() => setPhase({ story: active, at: "person" }), t.back * 1000),
      window.setTimeout(() => setPhase({ story: active, at: "home" }), (t.back + LEG) * 1000),
      window.setTimeout(() => setPhase({ story: active, at: "sorted" }), t.done * 1000),
      window.setTimeout(() => setActive((a) => (a + 1) % stories.length), t.total * 1000),
    ];
    return () => timers.forEach((id) => window.clearTimeout(id));
  }, [active, inView, t.back, t.done, t.total, stories.length]);

  const story = stories[active];
  // when each lit thing comes on: a ball when the first route reaches it, a person when theirs does
  const ballAt = (g: Group) => Math.min(...story.groups.map((x, i) => (x === g ? t.ball(i) : Infinity)));
  const personAt = (p: Supplier) => t.person(story.suppliers.indexOf(p));
  const isBall = (g: Group) => story.groups.includes(g);
  const isPerson = (p: Supplier) => story.suppliers.includes(p);
  const packetR = L.vertical ? 14 : 8;
  return (
    <figure
      ref={ref}
      className={`${m.wrap} ${wide ? "" : m.tall} ${inView ? m.playing : ""} ${className}`}
      aria-label="A map of how a request gets sorted: your request comes to Sorted by Us, we route it to the right kind of help, from gifts and shopping to home and events, and on to the people we work with, from florists and tailors to plumbers and caterers."
    >
      {/* what this request is: above the map, changes with each story; who it went to shows once the route gets there */}
      <figcaption key={active} className={m.caption} aria-hidden="true">
        <span className={m.ask}>“{story.ask}”</span>
        <span className={m.route} style={{ animationDelay: sec(t.person(0)) }}>{story.suppliers.map((x) => x.label).join(", ")}</span>
        {done && <span className={m.sorted}>Sorted</span>}
      </figcaption>
      <div className={`${m.map} ${bare ? m.bare : ""}`} style={{ aspectRatio: `${W} / ${H}` }}>
        <svg viewBox={`0 0 ${W} ${H}`} className={m.svg} aria-hidden="true">
          {/* the ring the categories sit on */}
          <ellipse className={m.ring} cx={hub.x} cy={hub.y} rx={ring.rx} ry={ring.ry} />
          <g className={m.offshoots}>{offshoots.map((d, i) => <path key={i} d={d} />)}</g>
          <g className={m.branches}>{branches.map((b, i) => <BranchPath key={i} b={b} still={still} />)}</g>
          {/* this story's route: the main branch draws out to the category, then the offshoot on to the person */}
          <g key={`r${active}`} className={m.highlight}>
            {story.branches.map((b, i) => <BranchPath key={`b${i}`} b={b} still={still} pathLength={1} style={{ animationDelay: sec(t.start(i)), animationDuration: sec(BRANCH) }} />)}
            {story.offs.map((d, i) => <path key={`o${i}`} d={d} pathLength={1} style={{ animationDelay: sec(t.ball(i)), animationDuration: sec(OFF) }} />)}
          </g>
          {/* your one message in, always lit, its dots flowing towards us; once the answer is on its way
              back to you the dots flow back towards you */}
          <path className={`${m.intake} ${home ? m.intakeHome : ""}`} d={intake} />
          {/* the ball this story is routed through pings: a soft ring swells out of it and fades, from when it lights */}
          <g className={m.halos}>
            {groups.filter(isBall).map((g) => <circle key={`${g.label}-${active}`} cx={g.x} cy={g.y} r={ballR} style={{ animationDelay: sec(ballAt(g)) }} />)}
          </g>
          <g className={m.balls}>
            {groups.map((g) => isBall(g)
              ? <circle key={`${g.label}-${active}`} cx={g.x} cy={g.y} r={ballR} className={m.on} style={{ animationDelay: sec(ballAt(g)) }} />
              : <circle key={g.label} cx={g.x} cy={g.y} r={ballR} />)}
          </g>
          <g className={m.people}>
            {groups.flatMap((g) => g.suppliers).map((p) => isPerson(p)
              ? <circle key={`${p.label}-${active}`} cx={p.x} cy={p.y} r={L.vertical ? 13 : 7} className={m.on} style={{ animationDelay: sec(personAt(p)) }} />
              : <circle key={p.label} cx={p.x} cy={p.y} r={L.vertical ? 8 : 4.5} />)}
          </g>
          <g key={`p${active}`} ref={anims}>
            {/* the request travelling in to us */}
            <circle className={m.packet} r={packetR} opacity={0}>
              <animateMotion data-at={0} begin="indefinite" dur={`${TRAVEL}s`} fill="freeze" path={intake} calcMode="spline" keyTimes="0;1" keySplines="0.4 0 0.2 1" />
              <animate data-at={0} attributeName="opacity" begin="indefinite" values="1;1;0" keyTimes="0;0.85;1" dur={`${TRAVEL}s`} fill="freeze" />
            </circle>
            {/* the answers coming back from everyone to us (paths run backwards) */}
            {story.paths.map((d, i) => (
              <circle key={`b${i}`} className={m.packet} r={packetR} opacity={0}>
                <animateMotion data-at={t.back} begin="indefinite" dur={`${LEG}s`} fill="freeze" path={d} calcMode="linear" keyPoints="1;0" keyTimes="0;1" />
                <animate data-at={t.back} attributeName="opacity" begin="indefinite" values="1;1;0" keyTimes="0;0.9;1" dur={`${LEG}s`} fill="freeze" />
              </circle>
            ))}
            {/* and one answer back along the dotted line to you */}
            <circle className={m.packet} r={packetR} opacity={0}>
              <animateMotion data-at={t.back + LEG} begin="indefinite" dur={`${LEG}s`} fill="freeze" path={intake} calcMode="linear" keyPoints="1;0" keyTimes="0;1" />
              <animate data-at={t.back + LEG} attributeName="opacity" begin="indefinite" values="1;1;0" keyTimes="0;0.9;1" dur={`${LEG}s`} fill="freeze" />
            </circle>
          </g>
        </svg>
        {/* each ball is a link to its service page (butter on the page means you can press it) */}
        {groups.map((g) => (
          <a
            key={isBall(g) ? `${g.label}-${active}` : g.label}
            href={`/services/${g.slug}`}
            aria-label={g.title}
            className={`${m.ballLabel} ${isBall(g) ? m.ballLabelOn : ""}`}
            style={{ left: pct(g.x, W), top: pct(g.y, H), width: pct(ballR * 2, W), height: pct(ballR * 2, H), ...(isBall(g) ? { animationDelay: sec(ballAt(g)) } : {}) }}
          >
            {g.label}
          </a>
        ))}
        {groups.flatMap((g) => g.suppliers).map((p) => (
          <span key={isPerson(p) ? `${p.label}-${active}` : p.label} className={`${m.person} ${m[p.side]} ${isPerson(p) ? m.personOn : ""}`} style={{ left: pct(p.x, W), top: pct(p.y, H), ...(isPerson(p) ? { animationDelay: sec(personAt(p)) } : {}) }} aria-hidden="true">{p.label}</span>
        ))}
        <span className={`${m.tag} ${L.vertical ? m.tagTop : m.tagLeft} ${done ? m.tagDone : ""}`} style={{ left: pct(request.x, W), top: pct(request.y, H) }} aria-hidden="true">{done ? "Sorted" : "Your request"}</span>
        <span className={m.request} style={{ left: pct(hub.x, W), top: pct(hub.y, H) }} aria-hidden="true">Sorted by Us</span>
        {!bare && <span className={m.cut} aria-hidden="true" />}
      </div>
    </figure>
  );
}
