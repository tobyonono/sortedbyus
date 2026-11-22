// "All videos": every composition and reel as a grid of thumbnails, with filters. Opened from the
// sidebar (All videos, Needs review, a campaign). Thumbnails only draw once scrolled into view, so
// a library of hundreds stays fast.
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { SanityClient } from "@sanity/client";
import { normaliseReel, reelSource, type ReelData } from "../../engine";
import { baseId, isDraft, preferDrafts, readComposition, sourceOf, type Doc, type StoredDoc } from "./compositions";
import { PlayablePreview } from "./PlayablePreview";
import { templateById, TEMPLATES } from "./templates";

export type LibraryFilter = {
  kind?: "all" | "reel" | "composition";
  status?: "any" | "review" | "approved";
  template?: string;
  campaign?: string;
  sort?: "recent" | "name";
};

export type Campaign = { _id: string; title: string; status?: string; motion: string[] };

type Item = {
  id: string;
  kind: "reel" | "composition";
  title: string;
  updatedAt: string;
  template?: string;
  review: boolean;
  status: string | null;
  approved: boolean;
  thumb: (() => ReturnType<NonNullable<ReturnType<typeof sourceOf>>>) | null;
  meta: string;
};

type Exported = { exports?: { approvedFor?: string[] }[] };
const approvedOf = (d: Exported) => !!d.exports?.some((e) => e.approvedFor?.length);

const ago = (iso: string) => {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  if (s < 7 * 86400) return `${Math.floor(s / 86400)} d ago`;
  return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short" });
};

export function LibraryView({
  client,
  filter,
  campaigns,
  title,
  onFilter,
  onOpen,
}: {
  client: SanityClient;
  filter: LibraryFilter;
  campaigns: Campaign[];
  title: string;
  onFilter: (f: LibraryFilter) => void;
  onOpen: (id: string, kind: "reel" | "composition") => void;
}) {
  const [docs, setDocs] = useState<{ comps: (StoredDoc & Exported & { _updatedAt: string })[]; reels: (Record<string, unknown> & Exported & { _id: string; title: string; _updatedAt: string })[] } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    Promise.all([
      client.fetch<(StoredDoc & Exported & { _updatedAt: string })[]>(`*[_type == "motionComposition"] | order(_updatedAt desc)`),
      client.fetch<(Record<string, unknown> & Exported & { _id: string; title: string; _updatedAt: string })[]>(`*[_type == "motionReel"] | order(_updatedAt desc)`),
    ])
      .then(([comps, reels]) => live && setDocs({ comps, reels }))
      .catch((e) => live && setError(String(e?.message ?? e)));
    return () => {
      live = false;
    };
  }, [client]);

  const items = useMemo<Item[]>(() => {
    if (!docs) return [];
    const compPairs = new Map<string, { draft: boolean; published: boolean }>();
    for (const d of docs.comps) {
      const k = baseId(d._id);
      const prev = compPairs.get(k) ?? { draft: false, published: false };
      compPairs.set(k, { draft: prev.draft || isDraft(d._id), published: prev.published || !isDraft(d._id) });
    }
    const comps = preferDrafts(docs.comps);
    const byBase = new Map([...comps].map(([k, d]) => [k, readComposition(d)] as const));
    const out: Item[] = [];
    for (const [k, raw] of comps) {
      const doc = byBase.get(k)!;
      const t = templateById(doc.template);
      const pair = compPairs.get(k)!;
      const src = sourceOf(doc);
      out.push({
        id: raw._id,
        kind: "composition",
        title: doc.title,
        updatedAt: raw._updatedAt,
        template: doc.template,
        review: pair.draft,
        status: pair.draft ? (pair.published ? "Unpublished changes" : "Draft") : null,
        approved: approvedOf(raw),
        thumb: src ? () => src(doc.data.format, doc.data.fps) : null,
        meta: t?.name ?? doc.template,
      });
    }
    const reels = preferDrafts(docs.reels);
    for (const [, raw] of reels) {
      const reel: ReelData = normaliseReel(raw);
      const resolve = (ref: string) => {
        const c: Doc | undefined = byBase.get(baseId(ref));
        const s = c && sourceOf(c);
        return c && s ? { source: s, title: c.title } : null;
      };
      out.push({
        id: raw._id,
        kind: "reel",
        title: raw.title,
        updatedAt: raw._updatedAt,
        review: isDraft(raw._id),
        status: isDraft(raw._id) ? "Draft" : null,
        approved: approvedOf(raw),
        thumb: reel.screens.length ? () => reelSource(reel, resolve)(reel.format, reel.fps) : null,
        meta: `Reel · ${reel.screens.length} ${reel.screens.length === 1 ? "screen" : "screens"}`,
      });
    }
    return out;
  }, [docs]);

  const campaign = campaigns.find((c) => c._id === filter.campaign);
  const shown = useMemo(() => {
    const inCampaign = campaign ? new Set(campaign.motion.map(baseId)) : null;
    const list = items.filter(
      (i) =>
        (!filter.kind || filter.kind === "all" || i.kind === filter.kind) &&
        (filter.status !== "review" || i.review) &&
        (filter.status !== "approved" || i.approved) &&
        (!filter.template || i.template === filter.template) &&
        (!inCampaign || inCampaign.has(baseId(i.id))),
    );
    return filter.sort === "name"
      ? list.sort((a, b) => a.title.localeCompare(b.title))
      : list.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }, [items, filter, campaign]);

  const set = (patch: Partial<LibraryFilter>) => onFilter({ ...filter, ...patch });

  return (
    <>
      <header className="topbar">
        <div className="topbar-left">
          <div className="brand-mark">
            <span>Motion</span>
          </div>
          <span className="library-title">{title}</span>
        </div>
        <div className="topbar-centre" />
        <div className="topbar-right" />
      </header>
      <main className="main library">
        <div className="library-filters">
          <Seg label="Type" value={filter.kind ?? "all"} options={[["all", "All"], ["reel", "Reels"], ["composition", "Compositions"]]} onChange={(v) => set({ kind: v as LibraryFilter["kind"] })} />
          <Seg label="Status" value={filter.status ?? "any"} options={[["any", "Any"], ["review", "Needs review"], ["approved", "Approved"]]} onChange={(v) => set({ status: v as LibraryFilter["status"] })} />
          <select className="input chip-select" value={filter.template ?? ""} onChange={(e) => set({ template: e.target.value || undefined })} aria-label="Template">
            <option value="">All templates</option>
            {TEMPLATES.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
          <select className="input chip-select" value={filter.campaign ?? ""} onChange={(e) => set({ campaign: e.target.value || undefined })} aria-label="Campaign">
            <option value="">All campaigns</option>
            {campaigns.map((c) => (
              <option key={c._id} value={c._id}>
                {c.title}
              </option>
            ))}
          </select>
          <select className="input chip-select sort" value={filter.sort ?? "recent"} onChange={(e) => set({ sort: e.target.value as LibraryFilter["sort"] })} aria-label="Sort">
            <option value="recent">Last edited</option>
            <option value="name">Name</option>
          </select>
          <span className="library-count">{docs ? `${shown.length} of ${items.length}` : ""}</span>
        </div>

        {error ? (
          <p className="hint library-empty">Couldn’t load the library: {error}</p>
        ) : !docs ? (
          <p className="hint library-empty">Loading…</p>
        ) : !shown.length ? (
          <div className="library-empty">
            <p className="hint">Nothing matches these filters.</p>
            <button className="btn ghost small" onClick={() => onFilter({})}>
              Clear filters
            </button>
          </div>
        ) : (
          <ul className="library-grid">
            {shown.map((i) => (
              <li key={i.id}>
                <button className="library-card" onClick={() => onOpen(i.id, i.kind)} title={i.title}>
                  <Lazy>{i.thumb ? <PlayablePreview playable={i.thumb()} width={200} still={25} className="library-thumb" fluid /> : <span className="library-thumb empty" />}</Lazy>
                  <span className="library-name">{i.title}</span>
                  <span className="comp-meta">
                    {i.status && <em className="badge">{i.status}</em>}
                    {i.approved && <em className="badge approved">Approved</em>}
                    {[i.meta, ago(i.updatedAt)].join(" · ")}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </main>
    </>
  );
}

function Seg({ label, value, options, onChange }: { label: string; value: string; options: [string, string][]; onChange: (v: string) => void }) {
  return (
    <div className="seg" role="radiogroup" aria-label={label}>
      {options.map(([v, l]) => (
        <button key={v} role="radio" aria-checked={value === v} className={value === v ? "is-on" : ""} onClick={() => onChange(v)}>
          {l}
        </button>
      ))}
    </div>
  );
}

/** Render children once they're near the viewport (thumbnails for big libraries). */
function Lazy({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [on, setOn] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || on) return;
    const io = new IntersectionObserver((entries) => entries.some((e) => e.isIntersecting) && setOn(true), { rootMargin: "300px" });
    io.observe(el);
    return () => io.disconnect();
  }, [on]);
  return (
    <span ref={ref} className="library-thumb-slot">
      {on ? children : <span className="library-thumb empty" />}
    </span>
  );
}
