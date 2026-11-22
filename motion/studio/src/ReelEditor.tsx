// Reel editor: compositions in order on one timeline, with trims and
// transitions. Screens point at compositions, so editing a composition changes
// every reel that uses it ("Make a separate copy" breaks that link for one screen).
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { SanityClient } from "@sanity/client";
import { useToast } from "@sanity/ui/toast";
import {
  templateField, aspectLabel, DIRECTIONS, FORMAT_KEYS, FPS_OPTIONS, formatSize, normaliseReel, reelSource, reelTimeline,
  TRANSITION_LABELS, TRANSITION_TYPES, type BaseData, type FormatKey, type ReelData, type ReelScreen, type ResolveScreen,
} from "../../engine";
import { applyPhoto, ControlSections, SpringField, type PhotoTarget } from "./Controls";
import { MediaPicker } from "./MediaPicker";
import { Campaigns } from "./Campaigns";
import { compositionLinks } from "./links";
import { baseId, isDraft, preferDrafts, readComposition, slugify, sourceOf, type Doc, type StoredDoc } from "./compositions";
import { download, exportVideo } from "./exporter";
import { ExportDialog, type ExportMeta } from "./ExportDialog";
import { Exports, type SavedExport } from "./Exports";
import { Modal } from "./Modal";
import { PlayablePreview } from "./PlayablePreview";
import { Stage } from "./Stage";
import { templateById, TEMPLATES } from "./templates";
import { uploadAsset } from "./uploadAsset";

type Reel = ReelData & { _id: string; title: string };
type Selection = { kind: "screen" | "transition"; key: string } | null;

/** Screen cards in the strip: the thumbnail fills the card. Tall formats crop a little so names stay readable. */
const THUMB_H = 132;
const CARD_MIN = 88;
const newKey = () => crypto.randomUUID().slice(0, 12);

export function ReelEditor({
  client,
  id,
  onOpenComposition,
  onChanged,
  autoExport,
  autoDownload,
}: {
  client: SanityClient;
  id: string;
  onOpenComposition: (id: string) => void;
  /** The sidebar should refresh (title, publish). */
  onChanged: () => void;
  /** From an export link: render these formats once loaded. */
  autoExport?: FormatKey[];
  autoDownload?: boolean;
}) {
  const toast = useToast();
  const fail = useCallback(
    (title: string, e: unknown) => toast.push({ status: "error", title, description: String((e as Error)?.message ?? e), closable: true, duration: 8000 }),
    [toast],
  );
  const [reel, setReel] = useState<Reel | null>(null);
  const [comps, setComps] = useState<Map<string, Doc>>(new Map());
  // True once the referenced compositions have been fetched (some may be missing).
  const [compsLoaded, setCompsLoaded] = useState(false);
  const [selection, setSelection] = useState<Selection>(null);
  const [adding, setAdding] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exports, setExports] = useState<SavedExport[] | null>(null);
  const [save, setSave] = useState<"saved" | "saving" | "error">("saved");
  const [savedTick, setSavedTick] = useState(0);
  const [drag, setDrag] = useState<number | null>(null);
  const frameRef = useRef(0);
  const pending = useRef<Reel | null>(null);

  // ---- loading ----
  const loadComps = useCallback(
    async (refs: string[]) => {
      if (!refs.length) {
        setComps(new Map());
        return setCompsLoaded(true);
      }
      const ids = [...new Set(refs.flatMap((r) => [baseId(r), `drafts.${baseId(r)}`]))];
      try {
        const docs = await client.fetch<StoredDoc[]>(`*[_type == "motionComposition" && _id in $ids]`, { ids });
        setComps(new Map([...preferDrafts(docs)].map(([k, d]) => [k, readComposition(d)])));
      } catch (e) {
        fail("Couldn’t load the reel’s compositions", e);
      } finally {
        setCompsLoaded(true);
      }
    },
    [client, fail],
  );

  const loadExports = useCallback(async () => {
    try {
      const r = await client.fetch<{ exports?: SavedExport[] } | null>(
        `*[_id == $id][0]{"exports": exports[]{_key, format, fps, seconds, createdAt, filename, approvedFor, "url": file.asset->url, "size": file.asset->size}}`,
        { id },
      );
      setExports(r?.exports ?? []);
    } catch (e) {
      setExports(null);
      fail("Couldn’t load exports", e);
    }
  }, [client, id, fail]);

  useEffect(() => {
    let live = true;
    client
      .getDocument<Record<string, unknown> & { _id: string; title: string }>(id)
      .then((d) => {
        if (!live || !d) return;
        const r = { ...normaliseReel(d), _id: d._id, title: d.title ?? "Reel" };
        setReel(r);
        void loadComps(r.screens.map((s) => s.composition?._ref ?? "").filter(Boolean));
        void loadExports();
      })
      .catch((e) => fail("Couldn’t open that reel", e));
    return () => {
      live = false;
    };
  }, [client, id, loadComps, loadExports, fail]);

  // ---- saving (debounced; the latest snapshot wins) ----
  const saveNow = useCallback(async () => {
    const r = pending.current;
    if (!r) return true;
    setSave("saving");
    try {
      await client.patch(r._id).set({ title: r.title, format: r.format, fps: r.fps, screens: r.screens }).commit();
      if (pending.current === r) pending.current = null;
      setSave("saved");
      setSavedTick((n) => n + 1);
      return true;
    } catch (e) {
      setSave("error");
      fail("Couldn’t save the reel", e);
      return false;
    }
  }, [client, fail]);

  useEffect(() => {
    if (!reel || pending.current !== reel) return;
    const t = setTimeout(() => void saveNow().then(onChanged), 700);
    return () => clearTimeout(t);
  }, [reel, saveNow, onChanged]);
  useEffect(() => () => void saveNow(), [saveNow]);

  const update = (next: Reel) => {
    pending.current = next;
    setReel(next);
  };

  // ---- editing a screen's composition from the reel (debounced save to that composition) ----
  const compPending = useRef(new Map<string, Doc>());
  const compTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flushCompositions = useCallback(async () => {
    if (compTimer.current) clearTimeout(compTimer.current);
    compTimer.current = null;
    const docs = [...compPending.current.values()];
    compPending.current.clear();
    if (!docs.length) return true;
    setSave("saving");
    try {
      for (const d of docs) {
        await client.patch(d._id).set({ [templateField(d.template)]: d.data, ...compositionLinks(d.template, d.data) }).unset(["data"]).commit();
      }
      setSave("saved");
      setSavedTick((n) => n + 1);
      onChanged();
      return true;
    } catch (e) {
      // keep them for the next try, unless newer edits arrived meanwhile
      for (const d of docs) if (!compPending.current.has(d._id)) compPending.current.set(d._id, d);
      setSave("error");
      fail("Couldn’t save the composition", e);
      return false;
    }
  }, [client, fail, onChanged]);
  useEffect(() => () => void flushCompositions(), [flushCompositions]);

  const editComposition = (doc: Doc, data: BaseData) => {
    const next = { ...doc, data };
    setComps((m) => new Map(m).set(baseId(doc._id), next));
    compPending.current.set(doc._id, next);
    if (compTimer.current) clearTimeout(compTimer.current);
    compTimer.current = setTimeout(() => void flushCompositions(), 700);
  };
  const [photoFor, setPhotoFor] = useState<{ id: string; target: PhotoTarget } | null>(null);
  const updateScreen = (key: string, patch: Partial<ReelScreen>) =>
    reel && update({ ...reel, screens: reel.screens.map((s) => (s._key === key ? { ...s, ...patch } : s)) });

  // ---- playable ----
  const resolve: ResolveScreen = useCallback(
    (ref) => {
      const c = comps.get(baseId(ref));
      const source = c && sourceOf(c);
      return c && source ? { source, title: c.title } : null;
    },
    [comps],
  );
  const source = useMemo(() => (reel ? reelSource(reel, resolve) : null), [reel, resolve]);
  const timeline = useMemo(() => (reel ? reelTimeline(reel, resolve) : null), [reel, resolve]);

  // ---- export (dialog and export links) ----
  const saveExport = useCallback(
    async (blob: Blob, meta: ExportMeta, signal?: AbortSignal) => {
      const asset = await uploadAsset(client, "file", blob, { filename: meta.filename, contentType: "video/mp4" }, signal);
      await client
        .patch(id)
        .setIfMissing({ exports: [] })
        .append("exports", [
          {
            _key: newKey(),
            _type: "motionReelExport",
            format: meta.format,
            fps: meta.fps,
            seconds: meta.seconds,
            filename: meta.filename,
            createdAt: new Date().toISOString(),
            file: { _type: "file", asset: { _type: "reference", _ref: asset._id } },
          },
        ])
        .commit({ signal });
      void loadExports();
    },
    [client, id, loadExports],
  );

  const autoRan = useRef(false);
  const compsReady = !!reel && compsLoaded;
  useEffect(() => {
    if (autoRan.current || !autoExport?.length || !reel || !source || !compsReady) return;
    autoRan.current = true;
    const tid = "motion-export-link";
    const progress = (title: string) => toast.push({ id: tid, status: "info", title, duration: 600_000 });
    (async () => {
      const done: string[] = [];
      try {
        for (const [i, format] of autoExport.entries()) {
          const label = `Rendering ${aspectLabel(format)}${autoExport.length > 1 ? ` (${i + 1} of ${autoExport.length})` : ""}`;
          let shown = -1;
          progress(label);
          const blob = await exportVideo(source, {
            format,
            fps: reel.fps,
            quality: "high",
            repeat: 1,
            onProgress: (p) => {
              const pct = Math.floor(p * 10) * 10;
              if (pct !== shown) progress(`${label} · ${(shown = pct)}%`);
            },
          });
          const filename = `${slugify(reel.title)}-${aspectLabel(format).replace(":", "x")}.mp4`;
          progress(`Saving ${aspectLabel(format)} to Sanity`);
          await saveExport(blob, { format, fps: reel.fps, seconds: source(format, reel.fps).frames() / reel.fps, filename });
          if (autoDownload) download(blob, filename);
          done.push(aspectLabel(format));
        }
        toast.push({ id: tid, status: "success", title: `Saved to Sanity: ${done.join(", ")}`, description: "They’re listed under Exports.", closable: true, duration: 15_000 });
        document.title = `Export done: ${done.join(", ")}`;
      } catch (e) {
        toast.push({ id: tid, status: "error", title: "Export failed", description: String((e as Error)?.message ?? e), closable: true, duration: 15_000 });
        document.title = "Export failed";
      }
      const url = new URL(window.location.href);
      url.searchParams.delete("export");
      url.searchParams.delete("download");
      window.history.replaceState(window.history.state, "", url);
    })();
  }, [autoExport, autoDownload, reel, source, compsReady, saveExport, toast]);

  // ---- actions ----
  const addScreen = (doc: Doc) => {
    if (!reel) return;
    const screen: ReelScreen = {
      _key: newKey(),
      composition: { _type: "reference", _ref: baseId(doc._id), _weak: true },
      trimStart: 0,
      trimEnd: 0,
      transition: reel.screens.at(-1)?.transition ?? normaliseReel({ screens: [{}] }).screens[0].transition,
    };
    setComps((m) => new Map(m).set(baseId(doc._id), doc));
    update({ ...reel, screens: [...reel.screens, screen] });
    setSelection({ kind: "screen", key: screen._key });
  };

  const separateCopy = async (screen: ReelScreen) => {
    const c = screen.composition?._ref ? comps.get(baseId(screen.composition._ref)) : null;
    if (!c || !reel) return;
    try {
      const created = await client.create({ _type: "motionComposition", title: `${c.title} (${reel.title})`, template: c.template, [templateFieldOf(c)]: c.data, ...compositionLinks(c.template, c.data) });
      const copy = { ...c, _id: created._id, title: created.title as string };
      setComps((m) => new Map(m).set(baseId(created._id), copy));
      updateScreen(screen._key, { composition: { _type: "reference", _ref: created._id, _weak: true } });
      onChanged();
      toast.push({ status: "success", title: "Made a separate copy", description: "Edits to it only change this reel." });
    } catch (e) {
      fail("Couldn’t copy the composition", e);
    }
  };

  const publish = async () => {
    if (!reel || !isDraft(reel._id) || !(await saveNow())) return;
    try {
      const draft = await client.getDocument<Record<string, unknown>>(reel._id);
      if (!draft) throw new Error("The draft no longer exists.");
      const { _id, _rev, _createdAt, _updatedAt, ...rest } = draft;
      void _id;
      void _rev;
      void _createdAt;
      void _updatedAt;
      await client.transaction().createOrReplace({ ...rest, _id: baseId(reel._id), _type: "motionReel" }).delete(reel._id).commit();
      toast.push({ status: "success", title: `Published “${reel.title}”` });
      onChanged();
      setReel({ ...reel, _id: baseId(reel._id) });
    } catch (e) {
      fail("Couldn’t publish", e);
    }
  };

  if (!reel || !source || !timeline) {
    return (
      <main className="main">
        <div className="empty">
          <p>Loading…</p>
        </div>
      </main>
    );
  }

  const selected = selection ? reel.screens.find((s) => s._key === selection.key) : null;
  const selectedIndex = selected ? reel.screens.indexOf(selected) : -1;
  const [W, H] = formatSize(reel.format);
  const cardW = Math.max(CARD_MIN, Math.round((THUMB_H * W) / H));
  const seconds = (frames: number) => `${(frames / reel.fps).toFixed(1)} s`;
  const naturalSeconds = (s: ReelScreen) => {
    const r = s.composition?._ref ? resolve(s.composition._ref) : null;
    return r ? Math.max(0.1, r.source(reel.format, reel.fps).frames() / reel.fps) : 2;
  };

  return (
    <>
      <header className="topbar">
        <div className="topbar-left">
          <div className="brand-mark">
            <span>Motion</span>
          </div>
          <input className="title-input" value={reel.title} onChange={(e) => update({ ...reel, title: e.target.value })} aria-label="Reel name" />
          <span className="save-slot" aria-live="polite">
            {save === "saving" || pending.current ? (
              <span className="save">Saving…</span>
            ) : save === "error" ? (
              <button className="btn ghost small save-error" onClick={() => void saveNow()}>
                Retry save
              </button>
            ) : savedTick > 0 ? (
              <span key={savedTick} className="save save-saved">
                Saved
              </span>
            ) : null}
          </span>
        </div>
        <div className="topbar-centre">
          <div className="seg formats-seg" role="radiogroup" aria-label="Format">
            {FORMAT_KEYS.map((k) => (
              <button key={k} role="radio" aria-checked={reel.format === k} className={reel.format === k ? "is-on" : ""} onClick={() => update({ ...reel, format: k })}>
                {aspectLabel(k)}
              </button>
            ))}
          </div>
        </div>
        <div className="topbar-right">
          {isDraft(reel._id) && (
            <button className="btn ghost" onClick={publish} title="Drafts come from agents or unpublished edits. Publishing makes this the reel.">
              Publish draft
            </button>
          )}
          <button className="btn primary" disabled={!reel.screens.length} onClick={() => setExporting(true)}>
            <svg viewBox="0 0 16 16" aria-hidden><path d="M8 2v8m-3.5-3.5L8 10l3.5-3.5M3 13h10" /></svg>
            Export
          </button>
        </div>
      </header>

      <main className="main reel-main">
        <Stage key={`${reel._id}|${reel.format}`} playable={source(reel.format, reel.fps)} frameRef={frameRef} />
        <div className="reel-strip" aria-label="Screens">
          {reel.screens.map((s, i) => {
            const slot = timeline.slots[i];
            const title = slot?.title ?? "Missing composition";
            const r = s.composition?._ref ? resolve(s.composition._ref) : null;
            const isSel = selection?.kind === "screen" && selection.key === s._key;
            return (
              <Fragment key={s._key}>
                <button
                  className={`reel-screen${isSel ? " is-on" : ""}${drag === i ? " is-dragging" : ""}${r ? "" : " is-missing"}`}
                  draggable
                  onDragStart={() => setDrag(i)}
                  onDragEnd={() => setDrag(null)}
                  onDragOver={(e) => {
                    e.preventDefault();
                    if (drag === null || drag === i) return;
                    const screens = [...reel.screens];
                    const [moved] = screens.splice(drag, 1);
                    screens.splice(i, 0, moved);
                    update({ ...reel, screens });
                    setDrag(i);
                  }}
                  onClick={() => setSelection({ kind: "screen", key: s._key })}
                  title={title}
                >
                  {r ? (
                    <PlayablePreview
                      playable={r.source(reel.format, reel.fps)}
                      width={cardW}
                      still={Math.round(reel.fps * 1.2)}
                      className="reel-thumb"
                      style={{ width: cardW, height: THUMB_H, objectFit: "cover" }}
                    />
                  ) : (
                    <span className="reel-thumb missing" style={{ width: cardW, height: THUMB_H }}>
                      Missing
                    </span>
                  )}
                  <span className="reel-screen-title">
                    {i + 1}. {title}
                  </span>
                  <span className="reel-screen-len">{slot ? seconds(slot.length) : ""}</span>
                </button>
                {i < reel.screens.length - 1 && (
                  <button
                    className={`reel-transition${selection?.kind === "transition" && selection.key === s._key ? " is-on" : ""}`}
                    onClick={() => setSelection({ kind: "transition", key: s._key })}
                    aria-label={`Transition after screen ${i + 1}: ${TRANSITION_LABELS[s.transition.type]}`}
                  >
                    {s.transition.type === "cut" ? "Cut" : `${TRANSITION_LABELS[s.transition.type]} ${s.transition.seconds.toFixed(1)}s`}
                  </button>
                )}
              </Fragment>
            );
          })}
          <button className="reel-add" style={{ height: THUMB_H }} onClick={() => setAdding(true)}>
            + Add screen
          </button>
        </div>
      </main>

      <aside className="panel">
        <div className="panel-head">
          <p className="panel-kind">Reel</p>
          <p className="panel-desc">
            {reel.screens.length} screens · {seconds(timeline.total)}. Screens use your compositions, so editing one updates every reel that uses it.
          </p>
        </div>

        {selected && selection?.kind === "screen" && (() => {
          const comp = selected.composition?._ref ? comps.get(baseId(selected.composition._ref)) : null;
          const tpl = comp ? templateById(comp.template) : null;
          return (
            <>
              <section className="section">
                <div className="section-head static">
                  <span>
                    Screen {selectedIndex + 1}: {timeline.slots[selectedIndex]?.title}
                  </span>
                </div>
                <div className="section-body">
                  {comp && tpl ? (
                    <div className="screen-actions">
                      <p className="hint">
                        {tpl.name}. Changes here update this composition in every reel that uses it.
                      </p>
                      <button className="btn ghost small" onClick={() => void separateCopy(selected)}>
                        Make a separate copy for this reel
                      </button>
                    </div>
                  ) : (
                    <p className="hint">This composition is missing. Remove the screen, or add another one.</p>
                  )}
                </div>
              </section>

              {comp && tpl && (
                <ControlSections
                  template={tpl}
                  data={comp.data}
                  onChange={(data) => editComposition(comp, data)}
                  onPickImage={(target) => setPhotoFor({ id: comp._id, target })}
                />
              )}

              <section className="section">
                <div className="section-head static">
                  <span>In this reel</span>
                </div>
                <div className="section-body">
                  <Range
                    label="Trim start"
                    value={selected.trimStart}
                    max={Math.max(0, naturalSeconds(selected) - selected.trimEnd - 0.2)}
                    onChange={(v) => updateScreen(selected._key, { trimStart: v })}
                  />
                  <Range
                    label="Trim end"
                    value={selected.trimEnd}
                    max={Math.max(0, naturalSeconds(selected) - selected.trimStart - 0.2)}
                    onChange={(v) => updateScreen(selected._key, { trimEnd: v })}
                  />
                  <div className="section-foot split">
                    {comp && (
                      <button
                        className="btn text"
                        onClick={() => void flushCompositions().then((ok) => ok && onOpenComposition(comp._id))}
                      >
                        Open in the composition editor
                      </button>
                    )}
                    <button
                      className="btn text danger"
                      onClick={() => {
                        update({ ...reel, screens: reel.screens.filter((s) => s._key !== selected._key) });
                        setSelection(null);
                      }}
                    >
                      Remove from reel
                    </button>
                  </div>
                </div>
              </section>
            </>
          );
        })()}

        {selected && selection?.kind === "transition" && (
          <section className="section">
            <div className="section-head static">
              <span>
                Transition {selectedIndex + 1} → {selectedIndex + 2}
              </span>
            </div>
            <div className="section-body">
              <div className="field">
                <span className="field-label">Type</span>
                <div className="seg full" role="radiogroup" aria-label="Transition type">
                  {TRANSITION_TYPES.map((t) => (
                    <button
                      key={t}
                      role="radio"
                      aria-checked={selected.transition.type === t}
                      className={selected.transition.type === t ? "is-on" : ""}
                      onClick={() => updateScreen(selected._key, { transition: { ...selected.transition, type: t } })}
                    >
                      {TRANSITION_LABELS[t]}
                    </button>
                  ))}
                </div>
              </div>
              {selected.transition.type === "smart" && (
                <p className="hint">
                  The same photo, or a line with the same words, glides from one screen to the next; everything else fades. Works between
                  Title card, Photo + caption and Photo mosaic; other templates crossfade.
                </p>
              )}
              {(selected.transition.type === "push" || selected.transition.type === "slide") && (
                <div className="field">
                  <span className="field-label">Direction</span>
                  <div className="seg full" role="radiogroup" aria-label="Direction">
                    {DIRECTIONS.map((d) => (
                      <button
                        key={d}
                        role="radio"
                        aria-checked={selected.transition.direction === d}
                        className={selected.transition.direction === d ? "is-on" : ""}
                        onClick={() => updateScreen(selected._key, { transition: { ...selected.transition, direction: d } })}
                      >
                        {d[0].toUpperCase() + d.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {selected.transition.type !== "cut" && (
                <>
                  <Range
                    label="Length"
                    value={selected.transition.seconds}
                    min={0.1}
                    max={2}
                    onChange={(v) => updateScreen(selected._key, { transition: { ...selected.transition, seconds: v } })}
                  />
                  <SpringField
                    control={{ key: "transition.spring", type: "spring", label: "Spring", group: "Transition" }}
                    value={selected.transition.spring}
                    onChange={(spring) => updateScreen(selected._key, { transition: { ...selected.transition, spring: spring as ReelScreen["transition"]["spring"] } })}
                  />
                </>
              )}
            </div>
          </section>
        )}

        {!selected && (
          <section className="section">
            <div className="section-body">
              <p className="hint" style={{ marginTop: 14 }}>
                Click a screen to trim it, or the chip between two screens to change the transition. Drag screens to reorder.
              </p>
            </div>
          </section>
        )}

        <section className="section">
          <div className="section-head static">
            <span>Frame rate</span>
          </div>
          <div className="section-body">
            <div className="seg full" role="radiogroup" aria-label="Frame rate">
              {FPS_OPTIONS.map((f) => (
                <button key={f} role="radio" aria-checked={reel.fps === f} className={reel.fps === f ? "is-on" : ""} onClick={() => update({ ...reel, fps: f })}>
                  {f}
                </button>
              ))}
            </div>
          </div>
        </section>

        <Campaigns client={client} id={reel._id} kind="reel" />
        <Exports
          items={exports ?? undefined}
          onApprove={(key, channels) => {
            setExports((x) => x?.map((e) => (e._key === key ? { ...e, approvedFor: channels } : e)) ?? x);
            client
              .patch(reel._id)
              .set({ [`exports[_key=="${key}"].approvedFor`]: channels })
              .commit()
              .catch((e) => fail("Couldn’t save the approval", e));
          }}
        />
      </aside>

      {adding && (
        <AddScreen
          client={client}
          format={reel.format}
          fps={reel.fps}
          onClose={() => setAdding(false)}
          onPick={(doc) => {
            setAdding(false);
            addScreen(doc);
          }}
          onCreate={async (templateId) => {
            const t = templateById(templateId);
            if (!t) return;
            try {
              const created = await client.create({ _type: "motionComposition", title: t.name, template: t.id, [templateField(t.id)]: t.defaults, ...compositionLinks(t.id, t.defaults) });
              setAdding(false);
              addScreen(readComposition(created as unknown as StoredDoc));
              onChanged();
              toast.push({ status: "success", title: `Added a new ${t.name}`, description: "Choose “Edit composition” to change its words and photos." });
            } catch (e) {
              fail("Couldn’t create the composition", e);
            }
          }}
        />
      )}
      {photoFor && (
        <MediaPicker
          client={client}
          onClose={() => setPhotoFor(null)}
          onPick={(v) => {
            const doc = comps.get(baseId(photoFor.id));
            setPhotoFor(null);
            if (!doc) return;
            const data = applyPhoto(doc.data, photoFor.target, v);
            if (data !== doc.data) editComposition(doc, data);
          }}
        />
      )}
      {exporting && (
        <ExportDialog
          title={reel.title}
          source={source}
          format={reel.format}
          fps={reel.fps}
          frame={frameRef.current}
          onSave={async (blob, meta, signal) => {
            await saveExport(blob, meta, signal);
            toast.push({ status: "success", title: `Saved ${aspectLabel(meta.format)} to Sanity`, description: "It’s listed under Exports." });
          }}
          onClose={() => setExporting(false)}
        />
      )}
    </>
  );
}

function templateFieldOf(doc: Doc) {
  return doc.template.replace(/-(\w)/g, (_, c: string) => c.toUpperCase());
}

function Range({ label, value, min = 0, max, onChange }: { label: string; value: number; min?: number; max: number; onChange: (v: number) => void }) {
  const v = Math.min(max, Math.max(min, value));
  return (
    <label className="field">
      <span className="field-label">
        {label}
        <span className="field-value">{v.toFixed(1)} s</span>
      </span>
      <input
        type="range"
        className="slider"
        min={min}
        max={Math.max(min + 0.1, max)}
        step={0.1}
        value={v}
        style={{ ["--p" as string]: `${((v - min) / Math.max(0.1, max - min)) * 100}%` }}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  );
}

/** Pick a composition to add as a screen, grouped by template, with stills in the reel's format. */
function AddScreen({
  client, format, fps, onPick, onCreate, onClose,
}: { client: SanityClient; format: FormatKey; fps: number; onPick: (doc: Doc) => void; onCreate: (templateId: string) => Promise<void>; onClose: () => void }) {
  const [creating, setCreating] = useState<string | null>(null);
  const [docs, setDocs] = useState<Doc[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    client
      .fetch<StoredDoc[]>(`*[_type == "motionComposition"] | order(_updatedAt desc)`)
      .then((all) => setDocs([...preferDrafts(all).values()].map(readComposition)))
      .catch((e) => setError(String(e?.message ?? e)));
  }, [client]);
  const [W, H] = formatSize(format);
  // One column width per shape, so every tile in the picker lines up.
  const width = W > H ? 236 : W === H ? 176 : 148;
  return (
    <Modal className="add-screen" label="Add a screen" onClose={onClose}>
      <header className="modal-head">
        <h2>Add a screen</h2>
        <button className="btn ghost small" onClick={onClose}>
          Close
        </button>
      </header>
      <div className="modal-body">
        <h3 className="add-heading">Start a new one</h3>
        <div className="add-new">
          {TEMPLATES.map((t) => (
            <button
              key={t.id}
              className="btn ghost small"
              disabled={!!creating}
              onClick={async () => {
                setCreating(t.id);
                await onCreate(t.id);
                setCreating(null);
              }}
            >
              {creating === t.id ? "Adding…" : `+ ${t.name}`}
            </button>
          ))}
        </div>
        <h3 className="add-heading">From your library</h3>
        {error && <p className="error">{error}</p>}
        {!docs && !error && <p className="hint">Loading compositions…</p>}
        {docs && !docs.length && <p className="hint">No compositions yet. Start a new one above.</p>}
        {docs && !!docs.length && (
          <div className="add-grid" style={{ gridTemplateColumns: `repeat(auto-fill, ${width}px)` }}>
            {TEMPLATES.flatMap((t) => docs.filter((d) => d.template === t.id)).map((d) => {
              const source = templateById(d.template) ? sourceOfSafe(d) : null;
              const playable = source?.(format, fps);
              return (
                <button key={d._id} className="add-tile" onClick={() => onPick(d)} title={d.title}>
                  {playable ? (
                    <PlayablePreview playable={playable} width={width} still={Math.round(fps * 1.2)} className="add-thumb" />
                  ) : (
                    <span className="add-thumb" style={{ width, height: Math.round((width * H) / W) }} />
                  )}
                  <span className="add-title">{d.title}</span>
                  <span className="add-meta">
                    {templateById(d.template)?.name ?? d.template}
                    {playable && ` · ${(playable.frames() / fps).toFixed(1)} s`}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </Modal>
  );
}

function sourceOfSafe(d: Doc) {
  try {
    return sourceOf(d);
  } catch {
    return null;
  }
}
