"use client";

import { useEffect, useRef, useState } from "react";
import m from "./NetworkMap.module.css";

/* A map of how a request gets sorted (after fragment.ai's living map). "Your request" comes in from the
   left as one line to Sorted by Us in the middle; from us, lines run out to the people we work with.
   They sit in loose groups around the six things we sort; each group is named, but nothing ends at the
   name. The people are the destinations: florist, baker, plumber, painter, caterer and so on.
   Your request's line is dotted and meets nothing but Sorted by Us. Each story closes the loop: the request
   travels in, the routes go out to one or more people, the answer travels back to you and the tag reads Sorted.
   Drawn the way the logo is drawn: straight runs joined by rounded turns, round ends. Every few seconds
   one request lights up in butter, from you, through us, to one person; their group's name lights too and
   the caption says what was asked for. Fixed seed, so server, client and captures draw the same picture.
   With reduced motion it holds still on the first story. */

type P = { x: number; y: number };

function rng(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const f = (n: number) => n.toFixed(1);
const sg = (n: number) => (n < 0 ? -1 : 1);

/** Like the logo's S: run along one axis, turn on a rounded corner, cross, turn, run on. */
function sRoute(a: P, b: P, vertical = false, radius = 22) {
  const dx = b.x - a.x, dy = b.y - a.y;
  if (Math.abs(vertical ? dx : dy) < 2) return `M${f(a.x)} ${f(a.y)}L${f(b.x)} ${f(b.y)}`;
  if (!vertical) {
    const mx = a.x + dx / 2, sx = sg(dx), sy = sg(dy);
    const r = Math.min(radius, Math.abs(dx) / 2, Math.abs(dy) / 2);
    return `M${f(a.x)} ${f(a.y)}H${f(mx - sx * r)}Q${f(mx)} ${f(a.y)} ${f(mx)} ${f(a.y + sy * r)}V${f(b.y - sy * r)}Q${f(mx)} ${f(b.y)} ${f(mx + sx * r)} ${f(b.y)}H${f(b.x)}`;
  }
  const my = a.y + dy / 2, sx = sg(dx), sy = sg(dy);
  const r = Math.min(radius, Math.abs(dx) / 2, Math.abs(dy) / 2);
  return `M${f(a.x)} ${f(a.y)}V${f(my - sy * r)}Q${f(a.x)} ${f(my)} ${f(a.x + sx * r)} ${f(my)}H${f(b.x - sx * r)}Q${f(b.x)} ${f(my)} ${f(b.x)} ${f(my + sy * r)}V${f(b.y)}`;
}
/** Short link: one rounded corner. */
function lRoute(a: P, b: P, radius = 10) {
  const dx = b.x - a.x, dy = b.y - a.y;
  const r = Math.min(radius, Math.abs(dx), Math.abs(dy));
  if (r < 1) return `M${f(a.x)} ${f(a.y)}L${f(b.x)} ${f(b.y)}`;
  return `M${f(a.x)} ${f(a.y)}H${f(b.x - sg(dx) * r)}Q${f(b.x)} ${f(a.y)} ${f(b.x)} ${f(a.y + sg(dy) * r)}V${f(b.y)}`;
}

type Supplier = { label: string; x: number; y: number };
type Group = { label: string; x: number; y: number; suppliers: Supplier[] };
type Layout = { W: number; H: number; request: P; hub: P; vertical: boolean; groups: Group[] };

/* Who we use for each kind of request. The first few of each are placed on the map. */
const TRADES: Record<string, string[]> = {
  "Shopping & Sourcing": ["Tailor", "Market trader", "Furniture maker", "Phone repairer"],
  "Gifts & Celebrations": ["Florist", "Baker", "Hamper maker"],
  "Travel & Holidays": ["Hotel", "Driver", "Travel agent"],
  "Errands & Admin": ["Courier", "Pharmacist", "Licensing agent"],
  "Home & Lifestyle": ["Plumber", "Painter", "Electrician", "Cleaner"],
  "Events & Experiences": ["Caterer", "Chef", "Decorator", "DJ"],
};

/* Wide: a full-width band. Request on the left, us in the middle, groups above, below and to the right. */
const WIDE: Layout = {
  W: 1600, H: 820, request: { x: 210, y: 410 }, hub: { x: 700, y: 410 }, vertical: false,
  groups: [
    { label: "Gifts & Celebrations", x: 300, y: 120, suppliers: [{ label: "Florist", x: 190, y: 220 }, { label: "Baker", x: 330, y: 260 }, { label: "Hamper maker", x: 450, y: 190 }] },
    { label: "Shopping & Sourcing", x: 760, y: 90, suppliers: [{ label: "Tailor", x: 600, y: 200 }, { label: "Market trader", x: 760, y: 240 }, { label: "Furniture maker", x: 900, y: 170 }, { label: "Phone repairer", x: 640, y: 120 }] },
    { label: "Travel & Holidays", x: 1300, y: 120, suppliers: [{ label: "Hotel", x: 1140, y: 230 }, { label: "Driver", x: 1300, y: 270 }, { label: "Travel agent", x: 1420, y: 200 }] },
    { label: "Errands & Admin", x: 300, y: 720, suppliers: [{ label: "Courier", x: 190, y: 600 }, { label: "Pharmacist", x: 340, y: 560 }, { label: "Licensing agent", x: 450, y: 630 }] },
    { label: "Events & Experiences", x: 780, y: 750, suppliers: [{ label: "Caterer", x: 620, y: 600 }, { label: "Chef", x: 780, y: 630 }, { label: "Decorator", x: 900, y: 570 }, { label: "DJ", x: 940, y: 690 }] },
    { label: "Home & Lifestyle", x: 1300, y: 720, suppliers: [{ label: "Plumber", x: 1130, y: 560 }, { label: "Painter", x: 1290, y: 590 }, { label: "Electrician", x: 1420, y: 540 }, { label: "Cleaner", x: 1160, y: 660 }] },
  ],
};

/* Tall: a column or a phone. Request at the top, us below it, the groups in two columns underneath. */
const tallGroup = (label: string, x: number, y: number): Group => ({
  label, x, y,
  suppliers: TRADES[label].slice(0, 3).map((t, i) => ({ label: t, x: x - 150 + i * 140, y: y + (i === 1 ? 110 : 70) })),
});
const TALL: Layout = {
  W: 1000, H: 1150, request: { x: 500, y: 90 }, hub: { x: 500, y: 270 }, vertical: true,
  groups: [
    tallGroup("Shopping & Sourcing", 260, 420), tallGroup("Gifts & Celebrations", 740, 420),
    tallGroup("Travel & Holidays", 260, 680), tallGroup("Errands & Admin", 740, 680),
    tallGroup("Home & Lifestyle", 260, 940), tallGroup("Events & Experiences", 740, 940),
  ],
};

/* One story per group: what was asked, and who sorted it. */
const STORIES = [
  { who: ["Florist"], ask: "Flowers for my mum on Sunday" },
  { who: ["Tailor"], ask: "Six yards of lace for a wedding" },
  /* some requests need more than one person */
  { who: ["Baker", "Decorator", "Chef"], ask: "My daughter’s fifth birthday party" },
  { who: ["Hotel"], ask: "Three quiet nights in Abuja" },
  { who: ["Courier"], ask: "Signed documents to my lawyer today" },
  { who: ["Painter", "Electrician", "Furniture maker"], ask: "Getting the new flat ready to move in" },
  { who: ["Caterer"], ask: "Dinner for twelve on Saturday" },
  { who: ["Plumber"], ask: "A leak fixed before the weekend" },
];

function build(L: Layout) {
  const r = rng(771);
  const gauss = () => (r() + r() + r() - 1.5) / 1.5;
  const { hub, groups } = L;
  /* rough boxes (in map units) around every piece of text, so no dot or dot-link lands on a word */
  const ch = L.vertical ? 13 : 8.5; // width per character of a supplier name
  const gw = L.vertical ? 15 : 11; // and of a group name
  type Box = { x0: number; x1: number; y0: number; y1: number };
  const boxes: Box[] = [
    ...groups.map((g) => ({ x0: g.x - (g.label.length * gw) / 2 - 12, x1: g.x + (g.label.length * gw) / 2 + 12, y0: g.y - 22, y1: g.y + 22 })),
    ...groups.flatMap((g) => g.suppliers.map((s) => ({ x0: s.x + 4, x1: s.x + 18 + s.label.length * ch, y0: s.y - 16, y1: s.y + 16 }))),
    L.vertical
      ? { x0: hub.x - 120, x1: hub.x + 120, y0: hub.y - 45, y1: hub.y + 45 }
      : { x0: hub.x - 95, x1: hub.x + 95, y0: hub.y - 30, y1: hub.y + 30 },
    L.vertical
      ? { x0: L.request.x - 120, x1: L.request.x + 120, y0: L.request.y - 80, y1: L.request.y + 6 }
      : { x0: L.request.x - 190, x1: L.request.x + 6, y0: L.request.y - 30, y1: L.request.y + 30 },
  ];
  const hits = (x0: number, y0: number, x1: number, y1: number) =>
    boxes.some((b) => Math.min(x0, x1) < b.x1 && Math.max(x0, x1) > b.x0 && Math.min(y0, y1) < b.y1 && Math.max(y0, y1) > b.y0);

  /* loose dots around each group, kept clear of all text, joined to their nearest neighbour */
  const nodes: (P & { s: number })[] = [];
  for (const g of groups) {
    let placed = 0, tries = 0;
    while (placed < 22 && tries++ < 400) {
      const x = Math.round((g.x + gauss() * 170) / 6) * 6;
      const y = Math.round((g.y + (L.vertical ? 70 : g.y < hub.y ? 90 : -90) + gauss() * 110) / 6) * 6;
      if (x < 20 || x > L.W - 20 || y < 20 || y > L.H - 20) continue;
      if (hits(x - 8, y - 8, x + 8, y + 8)) continue;
      nodes.push({ x, y, s: r() < 0.1 ? 4.5 : r() < 0.45 ? 3 : 2 });
      placed++;
    }
  }
  const links: string[] = [];
  nodes.forEach((n, i) => {
    const near = nodes.map((o, j) => ({ j, d: (o.x - n.x) ** 2 + (o.y - n.y) ** 2 })).filter((o) => o.j !== i).sort((a, b) => a.d - b.d);
    const o = nodes[near[0].j];
    if ((near[0].j > i || r() < 0.3) && !hits(n.x, n.y, o.x, o.y)) links.push(lRoute(n, o));
  });
  /* every supplier is wired straight back to us. Routes to people left of us leave the hub upwards or
     downwards (never along the line your request comes in on), so your request only meets Sorted by Us. */
  const spokeTo = (s: Supplier) =>
    sRoute(hub, s, L.vertical || s.x < hub.x || Math.abs(s.y - hub.y) > Math.abs(s.x - hub.x), 18);
  const spokes: string[] = [];
  for (const g of groups) for (const s of g.suppliers) {
    spokes.push(spokeTo(s));
    // tie each supplier to its nearest dot whose link stays off the text
    const near = nodes.map((o) => ({ o, d: (o.x - s.x) ** 2 + (o.y - s.y) ** 2 })).sort((a, b) => a.d - b.d);
    const ok = near.slice(0, 6).find(({ o }) => !hits(s.x + (o.x > s.x ? 6 : 0), s.y, o.x, o.y));
    if (ok) links.push(lRoute(s, ok.o));
  }
  const intake = sRoute(L.request, hub, L.vertical, 18);
  /* stories: you -> us -> one supplier */
  const all = groups.flatMap((g) => g.suppliers.map((s) => ({ s, g })));
  const stories = STORIES.map((st) => {
    const hits = st.who.map((w) => all.find((a) => a.s.label === w)!);
    const groupsLit = [...new Set(hits.map((h) => h.g))];
    return { ...st, suppliers: hits.map((h) => h.s), groups: groupsLit, paths: hits.map((h) => spokeTo(h.s)) };
  });
  const twinkle = nodes.map(() => ({ dur: 2.5 + r() * 3.5, delay: -r() * 6 }));
  return { nodes, links, spokes, intake, stories, twinkle };
}

const pct = (v: number, of: number) => `${(v / of) * 100}%`;
/* One story, in seconds: the request travels in to us (0 to TRAVEL); the routes out draw one after
   another (STAGGER apart); the answers come back from every person to us together, then one comes back
   to you; "Sorted" shows, then the next story starts. */
const TRAVEL = 1;
const DRAW = 0.9;
const STAGGER = 0.45;
const LEG = 0.8;
const HOLD = 2.2;
const timing = (n: number) => {
  const back = TRAVEL + (n - 1) * STAGGER + DRAW + 0.4;
  const done = back + LEG * 2;
  return { back, done, total: done + HOLD };
};

export default function NetworkMap({ bare = false, wide = false, className = "" }: { bare?: boolean; wide?: boolean; className?: string }) {
  const L = wide ? WIDE : TALL;
  const { W, H, request, hub, groups } = L;
  const { nodes, links, spokes, intake, stories, twinkle } = build(L);
  const [active, setActive] = useState(0);
  const [inView, setInView] = useState(false);
  const ref = useRef<HTMLElement>(null);
  const anims = useRef<SVGGElement>(null);
  // which story has come back sorted (compared with `active`, so a new story starts unsorted)
  const [sortedStory, setSortedStory] = useState(-1);
  const done = sortedStory === active;
  const t = timing(stories[active].paths.length);

  // Only animate while the map is on screen, and never with reduced motion.
  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { threshold: 0.25 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Each story: start its SVG animations by hand (ones added after load would count from page load and
  // already be over), mark it sorted once the answer is back with you, then move on to the next.
  useEffect(() => {
    if (!inView) return;
    anims.current?.querySelectorAll<SVGAnimationElement>("[data-at]").forEach((a) => a.beginElementAt(Number(a.dataset.at)));
    const sorted = window.setTimeout(() => setSortedStory(active), t.done * 1000);
    const next = window.setTimeout(() => setActive((a) => (a + 1) % stories.length), t.total * 1000);
    return () => { window.clearTimeout(sorted); window.clearTimeout(next); };
  }, [active, inView, t.done, t.total, stories.length]);

  const story = stories[active];
  return (
    <figure
      ref={ref}
      className={`${m.wrap} ${wide ? "" : m.tall} ${className}`}
      aria-label="A map of how a request gets sorted: your request comes to Sorted by Us, and we take it to the people we work with, from florists and tailors to plumbers and caterers."
    >
      <div className={`${m.map} ${bare ? m.bare : ""}`} style={{ aspectRatio: `${W} / ${H}` }}>
        <svg viewBox={`0 0 ${W} ${H}`} className={m.svg} aria-hidden="true">
          <g className={m.links}>{links.map((d, i) => <path key={i} d={d} />)}</g>
          <g className={m.trunks}>{spokes.map((d, i) => <path key={i} d={d} />)}</g>
          <g className={m.nodes}>
            {nodes.map((n, i) => (
              <circle key={i} cx={n.x} cy={n.y} r={n.s} style={{ animationDuration: `${twinkle[i].dur}s`, animationDelay: `${twinkle[i].delay}s` }} />
            ))}
          </g>
          <g className={m.people}>
            {groups.flatMap((g) => g.suppliers).map((s) => (
              <circle key={s.label} cx={s.x} cy={s.y} r={story.suppliers.includes(s) ? 7 : 4.5} className={story.suppliers.includes(s) ? m.endOn : ""} />
            ))}
          </g>
          {/* your one message in, always lit; then the route out, redrawn for each story */}
          <path className={m.intake} d={intake} />
          {/* each story: the request travels in along the dotted line, then the route out draws once it arrives */}
          <g key={active} ref={anims} className={m.highlight}>
            {/* the request travelling in to us */}
            <circle className={m.packet} r={L.vertical ? 12 : 8} opacity={0}>
              <animateMotion data-at={0} begin="indefinite" dur={`${TRAVEL}s`} fill="freeze" path={intake} calcMode="spline" keyTimes="0;1" keySplines="0.4 0 0.2 1" />
              <animate data-at={0} attributeName="opacity" begin="indefinite" values="1;1;0" keyTimes="0;0.85;1" dur={`${TRAVEL}s`} fill="freeze" />
            </circle>
            {/* out to each person, one after another */}
            {story.paths.map((d, i) => <path key={i} d={d} pathLength={1} style={{ animationDelay: `${TRAVEL + i * STAGGER}s` }} />)}
            {/* the answers coming back from everyone to us (paths run backwards) */}
            {story.paths.map((d, i) => (
              <circle key={`b${i}`} className={m.packet} r={L.vertical ? 12 : 8} opacity={0}>
                <animateMotion data-at={t.back} begin="indefinite" dur={`${LEG}s`} fill="freeze" path={d} calcMode="linear" keyPoints="1;0" keyTimes="0;1" />
                <animate data-at={t.back} attributeName="opacity" begin="indefinite" values="1;1;0" keyTimes="0;0.9;1" dur={`${LEG}s`} fill="freeze" />
              </circle>
            ))}
            {/* and one answer back along the dotted line to you */}
            <circle className={m.packet} r={L.vertical ? 12 : 8} opacity={0}>
              <animateMotion data-at={t.back + LEG} begin="indefinite" dur={`${LEG}s`} fill="freeze" path={intake} calcMode="linear" keyPoints="1;0" keyTimes="0;1" />
              <animate data-at={t.back + LEG} attributeName="opacity" begin="indefinite" values="1;1;0" keyTimes="0;0.9;1" dur={`${LEG}s`} fill="freeze" />
            </circle>
          </g>
        </svg>
        {groups.map((g) => (
          <span key={g.label} className={`${m.group} ${story.groups.includes(g) ? m.groupOn : ""}`} style={{ left: pct(g.x, W), top: pct(g.y, H) }} aria-hidden="true">{g.label}</span>
        ))}
        {groups.flatMap((g) => g.suppliers).map((s) => (
          <span key={s.label} className={`${m.person} ${story.suppliers.includes(s) ? m.personOn : ""}`} style={{ left: pct(s.x, W), top: pct(s.y, H) }} aria-hidden="true">{s.label}</span>
        ))}
        <span className={`${m.tag} ${L.vertical ? m.tagTop : m.tagLeft} ${done ? m.tagDone : ""}`} style={{ left: pct(request.x, W), top: pct(request.y, H) }} aria-hidden="true">{done ? "Sorted" : "Your request"}</span>
        <span className={m.request} style={{ left: pct(hub.x, W), top: pct(hub.y, H) }} aria-hidden="true">Sorted by Us</span>
        {!bare && <span className={m.cut} aria-hidden="true" />}
      </div>
      {/* what this route was: changes with each story */}
      <figcaption key={active} className={m.caption} aria-hidden="true">
        <span className={m.ask}>“{story.ask}”</span>
        <span className={m.route}>{story.suppliers.map((x) => x.label).join(", ")}</span>
        {done && <span className={m.sorted}>Sorted</span>}
      </figcaption>
    </figure>
  );
}
