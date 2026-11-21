import { useCallback, useEffect, useRef, useState } from "react";
import type { SanityClient } from "@sanity/client";
import { useToast } from "@sanity/ui/toast";
import { aspectLabel, FORMAT_KEYS, normalise, templateField, type BaseData, type FormatKey } from "../../engine";
import { exportVideo } from "./exporter";
import { Controls } from "./Controls";
import { ExportDialog } from "./ExportDialog";
import { Exports, type SavedExport } from "./Exports";
import { NewComposition } from "./NewComposition";
import { MediaPicker } from "./MediaPicker";
import { Stage } from "./Stage";
import { templateById, TEMPLATES } from "./templates";

const TYPE = "motionComposition";

/** One composition in the list. `_id` is what opens: the draft if there is one. */
type Row = { _id: string; title: string; template: string; _updatedAt: string; screens?: number; draft: boolean; published: boolean };
type Doc = { _id: string; title: string; template: string; data: BaseData };
const baseId = (id: string) => id.replace(/^drafts\./, "");
const isDraft = (id: string) => id.startsWith("drafts.");

// Links: ?c=<id> opens a composition; &export=story,portrait renders those formats
// on load and saves them to Sanity (for agents with a browser, or a person).
const onMotion = /\/motion|\/harness\.html$/.test(window.location.pathname);
const params = new URLSearchParams(onMotion ? window.location.search : "");
const linkedId = params.get("c");
const linkedExport = params.get("export")?.split(",").filter((f): f is FormatKey => (FORMAT_KEYS as string[]).includes(f)) ?? [];
const linkedDownload = params.get("download") === "1";
type FormatKeyOf = BaseData["format"];
type Save = "saved" | "saving" | "unsaved" | "error";

/** The whole motion studio. `client` is the signed-in user's Sanity client from the host (the Studio tool). */
export function Studio({ client }: { client: SanityClient }) {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [doc, setDoc] = useState<Doc | null>(null);
  const [save, setSave] = useState<Save>("saved");
  // Bumped on each successful save so the "Saved" note replays its fade.
  const [savedTick, setSavedTick] = useState(0);
  const [past, setPast] = useState<BaseData[]>([]);
  const [future, setFuture] = useState<BaseData[]>([]);
  const [picker, setPicker] = useState<((v: string) => void) | null>(null);
  const [exporting, setExporting] = useState(false);
  const [choosing, setChoosing] = useState(false);
  const [exports, setExports] = useState<SavedExport[]>([]);
  // Messages use the Studio's own toasts (Sanity UI), so they sit with Sanity's.
  const toast = useToast();
  const fail = useCallback(
    (title: string, e: unknown) => toast.push({ status: "error", title, description: String((e as Error)?.message ?? e), closable: true, duration: 8000 }),
    [toast],
  );
  const frameRef = useRef(0);
  const dirty = useRef(false);
  // The latest doc, so a pending save can be flushed before switching or publishing.
  const latest = useRef<Doc | null>(null);
  latest.current = doc;

  const refresh = useCallback(
    () =>
      client
        .fetch<Omit<Row, "draft" | "published">[]>(
          `*[_type == $t] | order(_updatedAt desc){_id, title, template, _updatedAt, "screens": coalesce(count(sortFlash.beats), count(cardJourney.stops), count(data.beats), count(data.stops))}`,
          { t: TYPE },
        )
        .then((all) => {
          // Merge each draft with its published version; agents create drafts.
          const byBase = new Map<string, Row>();
          for (const r of all) {
            const key = baseId(r._id);
            const prev = byBase.get(key);
            const draft = isDraft(r._id);
            const row: Row = { ...r, draft: draft || !!prev?.draft, published: !draft || !!prev?.published };
            if (!prev || draft) byBase.set(key, { ...row, published: row.published || !!prev?.published });
            else byBase.set(key, { ...prev, published: true });
          }
          setRows([...byBase.values()]);
        })
        .catch((e) => fail("Couldn’t load compositions", e)),
    [client, fail],
  );

  useEffect(() => {
    refresh();
  }, [refresh]);

  /** Save the open composition now (title + its template's data). */
  const saveNow = useCallback(async () => {
    const d = latest.current;
    if (!d || !dirty.current) return;
    setSave("saving");
    try {
      dirty.current = false;
      await client
        .patch(d._id)
        .set({ title: d.title, [templateField(d.template)]: d.data })
        .unset(["data"])
        .commit();
      setSave("saved");
      setSavedTick((n) => n + 1);
      setRows((r) => r?.map((x) => (x._id === d._id ? { ...x, title: d.title } : x)) ?? r);
    } catch (e) {
      dirty.current = true;
      setSave("error");
      fail("Couldn’t save", e);
    }
  }, [client, fail]);

  const open = useCallback(
    async (id: string) => {
      await saveNow(); // don't lose an edit made just before switching
      const d = await client.getDocument<Doc & Record<string, unknown>>(id).catch((e) => (fail("Couldn’t open that composition", e), undefined));
      if (!d) return;
      const t = templateById(d.template);
      // Data lives under the template's field (older compositions used `data`);
      // normalise fills new fields and replaces anything off-brand.
      const stored = d[templateField(d.template)] ?? d.data;
      setDoc({ _id: d._id, title: d.title, template: d.template, data: t ? normalise(t, stored) : (stored as BaseData) });
      loadExports(id);
      const url = new URL(window.location.href);
      url.searchParams.set("c", baseId(id));
      window.history.replaceState(window.history.state, "", url);
      setPast([]);
      setFuture([]);
      setSave("saved");
      dirty.current = false;
    },
    [client, saveNow, fail],
  );

  async function loadExports(id: string) {
    const r = await client.fetch<{ exports?: SavedExport[] } | null>(
      `*[_id == $id][0]{"exports": exports[]{_key, format, fps, seconds, createdAt, filename, "url": file.asset->url, "size": file.asset->size}}`,
      { id },
    );
    setExports(r?.exports ?? []);
  }

  /** Upload an exported MP4 to Sanity and list it on the composition. */
  async function saveExport(blob: Blob, meta: { format: FormatKeyOf; fps: number; seconds: number; filename: string }, quiet = false) {
    if (!doc) return;
    const asset = await client.assets.upload("file", blob, { filename: meta.filename, contentType: "video/mp4" });
    await client
      .patch(doc._id)
      .setIfMissing({ exports: [] })
      .append("exports", [
        {
          _key: crypto.randomUUID().slice(0, 12),
          _type: "motionExport",
          format: meta.format,
          fps: meta.fps,
          seconds: meta.seconds,
          filename: meta.filename,
          createdAt: new Date().toISOString(),
          file: { _type: "file", asset: { _type: "reference", _ref: asset._id } },
        },
      ])
      .commit();
    await loadExports(doc._id);
    if (!quiet) toast.push({ status: "success", title: `Saved ${aspectLabel(meta.format)} to Sanity`, description: "It’s listed under Exports." });
  }

  useEffect(() => {
    if (!rows?.length || doc) return;
    const linked = linkedId && rows.find((r) => baseId(r._id) === baseId(linkedId));
    open(linked ? linked._id : rows[0]._id);
  }, [rows, doc, open]);

  // Export link: render the requested formats once the linked composition is open.
  // Progress shows as one Studio toast that updates; the page title tells agents when it's done.
  const autoRan = useRef(false);
  useEffect(() => {
    if (autoRan.current || !linkedExport.length || !doc || baseId(doc._id) !== baseId(linkedId ?? "")) return;
    const t = templateById(doc.template);
    if (!t) return;
    autoRan.current = true;
    const id = "motion-export-link";
    const progress = (title: string) => toast.push({ id, status: "info", title, duration: 600_000 });
    (async () => {
      const done: string[] = [];
      try {
        for (const [i, format] of linkedExport.entries()) {
          const label = `Rendering ${aspectLabel(format)}${linkedExport.length > 1 ? ` (${i + 1} of ${linkedExport.length})` : ""}`;
          let shown = -1;
          progress(label);
          const blob = await exportVideo(t, doc.data, {
            format,
            fps: doc.data.fps,
            quality: "high",
            repeat: 1,
            onProgress: (p) => {
              const pct = Math.floor(p * 10) * 10; // update every 10%
              if (pct !== shown) progress(`${label} · ${(shown = pct)}%`);
            },
          });
          const filename = `${slugify(doc.title)}-${aspectLabel(format).replace(":", "x")}.mp4`;
          progress(`Saving ${aspectLabel(format)} to Sanity`);
          await saveExport(blob, { format, fps: doc.data.fps, seconds: t.frames({ ...doc.data, format }) / doc.data.fps, filename }, true);
          if (linkedDownload) download(blob, filename);
          done.push(aspectLabel(format));
        }
        toast.push({ id, status: "success", title: `Saved to Sanity: ${done.join(", ")}`, description: "They’re listed under Exports.", closable: true, duration: 15_000 });
        document.title = `Export done: ${done.join(", ")}`;
      } catch (e) {
        toast.push({ id, status: "error", title: "Export failed", description: String((e as Error)?.message ?? e), closable: true, duration: 15_000 });
        document.title = "Export failed";
      }
      const url = new URL(window.location.href);
      url.searchParams.delete("export");
      url.searchParams.delete("download");
      window.history.replaceState(window.history.state, "", url);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc]);

  // Autosave shortly after the last edit.
  useEffect(() => {
    if (!doc || !dirty.current) return;
    setSave("unsaved");
    const t = setTimeout(saveNow, 700);
    return () => clearTimeout(t);
  }, [doc, saveNow]);

  const edit = (data: BaseData) => {
    if (!doc) return;
    dirty.current = true;
    setPast((p) => [...p.slice(-80), doc.data]);
    setFuture([]);
    setDoc({ ...doc, data });
  };
  const rename = (title: string) => {
    if (!doc) return;
    dirty.current = true;
    setDoc({ ...doc, title });
  };
  const undo = () => {
    if (!doc || !past.length) return;
    dirty.current = true;
    setFuture((f) => [doc.data, ...f]);
    setDoc({ ...doc, data: past[past.length - 1] });
    setPast((p) => p.slice(0, -1));
  };
  const redo = () => {
    if (!doc || !future.length) return;
    dirty.current = true;
    setPast((p) => [...p, doc.data]);
    setDoc({ ...doc, data: future[0] });
    setFuture((f) => f.slice(1));
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.key.toLowerCase() !== "z") return;
      if (e.target instanceof Element && e.target.closest("input, textarea")) return;
      e.preventDefault();
      if (e.shiftKey) redo();
      else undo();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const create = async (templateId: string, from?: Doc) => {
    const t = templateById(templateId)!;
    const created = await client
      .create({
      _type: TYPE,
      title: from ? `${from.title} copy` : t.name,
      template: t.id,
        [templateField(t.id)]: from ? from.data : t.defaults,
      })
      .catch((e) => (fail("Couldn’t create the composition", e), null));
    if (!created) return;
    await refresh();
    open(created._id);
  };

  const remove = async (row: Row) => {
    if (!confirm(`Delete “${row.title}”? Exports you've downloaded are not affected.`)) return;
    try {
      await client.transaction().delete(baseId(row._id)).delete(`drafts.${baseId(row._id)}`).commit();
    } catch (e) {
      return fail("Couldn’t delete it", e);
    }
    if (doc && baseId(doc._id) === baseId(row._id)) setDoc(null);
    toast.push({ status: "success", title: `Deleted “${row.title}”`, description: "Videos already exported stay in the media library." });
    refresh();
  };

  /** Publish a draft (e.g. one an agent made): it becomes the composition, the draft goes. */
  const publish = async () => {
    if (!doc || !isDraft(doc._id)) return;
    await saveNow(); // publish what's on screen, including an edit still waiting to save
    const draft = await client.getDocument<Record<string, unknown>>(doc._id);
    if (!draft) return;
    const { _id, _rev, _createdAt, _updatedAt, ...rest } = draft;
    void _rev;
    void _createdAt;
    void _updatedAt;
    try {
      await client.transaction().createOrReplace({ ...rest, _id: baseId(String(_id)), _type: TYPE }).delete(String(_id)).commit();
    } catch (e) {
      return fail("Couldn’t publish", e);
    }
    toast.push({ status: "success", title: `Published “${doc.title}”` });
    await refresh();
    open(baseId(doc._id));
  };

  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      document.querySelectorAll<HTMLDetailsElement>(".studio .comp-menu[open]").forEach((d) => {
        if (!d.contains(e.target as Node)) d.open = false;
      });
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, []);

  const template = doc ? templateById(doc.template) : null;

  return (
    <div className="studio">
      <header className="topbar">
        <div className="topbar-left">
          <div className="brand-mark">
            <span>Motion</span>
          </div>
          {doc ? (
            <input className="title-input" value={doc.title} onChange={(e) => rename(e.target.value)} aria-label="Composition name" />
          ) : (
            <span className="title-input" />
          )}
          <span className="save-slot" aria-live="polite">
            {save === "unsaved" || save === "saving" ? (
              <span className="save">Saving…</span>
            ) : save === "error" ? (
              <span className="save save-error">Couldn’t save</span>
            ) : savedTick > 0 ? (
              <span key={savedTick} className="save save-saved">
                Saved
              </span>
            ) : null}
          </span>
        </div>
        <div className="topbar-centre">
          {doc && (
            <div className="seg formats-seg" role="radiogroup" aria-label="Format">
              {FORMAT_KEYS.map((k: FormatKey) => (
                <button key={k} role="radio" aria-checked={doc.data.format === k} className={doc.data.format === k ? "is-on" : ""} onClick={() => edit({ ...doc.data, format: k })}>
                  {aspectLabel(k)}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="topbar-right">
          {doc && isDraft(doc._id) && (
            <button className="btn ghost" onClick={publish} title="Drafts come from agents or unpublished edits. Publishing makes this the composition.">
              Publish draft
            </button>
          )}
          <button className="icon-btn" onClick={undo} disabled={!past.length} aria-label="Undo">
            <svg viewBox="0 0 16 16"><path d="M6 4 3 7l3 3M3 7h6.5a3.5 3.5 0 0 1 0 7H8" /></svg>
          </button>
          <button className="icon-btn" onClick={redo} disabled={!future.length} aria-label="Redo">
            <svg viewBox="0 0 16 16"><path d="m10 4 3 3-3 3m3-3H6.5a3.5 3.5 0 0 0 0 7H8" /></svg>
          </button>
          <button className="btn primary" disabled={!doc} onClick={() => setExporting(true)}>
            <svg viewBox="0 0 16 16" aria-hidden><path d="M8 2v8m-3.5-3.5L8 10l3.5-3.5M3 13h10" /></svg>
            Export
          </button>
        </div>
      </header>

      <nav className="sidebar">
        <div className="sidebar-head">
          <h2>Compositions</h2>
          <button className="btn ghost small" onClick={() => setChoosing(true)}>
            <svg viewBox="0 0 16 16" aria-hidden><path d="M8 3v10M3 8h10" /></svg>
            New
          </button>
        </div>
        <div className="comp-groups">
          {TEMPLATES.map((t) => {
            const group = rows?.filter((r) => r.template === t.id) ?? [];
            if (!group.length) return null;
            return (
              <div key={t.id} className="comp-group">
                <h3 className="comp-group-title">{t.name}</h3>
                <ul className="comp-list">
                  {group.map((r) => (
                    <li key={r._id} className={doc && baseId(doc._id) === baseId(r._id) ? "is-on" : ""}>
                      <button className="comp" onClick={() => open(r._id)}>
                        <span className="comp-text">
                          <strong>
                            {r.title}
                            {r.draft && <em className="badge">{r.published ? "Changes" : "Draft"}</em>}
                          </strong>
                          <small>{r.screens ? `${r.screens} ${t.id === "card-journey" ? "stops" : "screens"}` : t.kind}</small>
                        </span>
                      </button>
                      <details className="comp-menu">
                        <summary aria-label="More">⋯</summary>
                        <div>
                          <button
                            onClick={async (e) => {
                              closeMenu(e.currentTarget);
                              await saveNow();
                              const d = await client.getDocument<Doc & Record<string, unknown>>(r._id);
                              const t = d && templateById(d.template);
                              if (d && t) create(d.template, { ...d, data: normalise(t, d[templateField(d.template)] ?? d.data) });
                            }}
                          >
                            Duplicate
                          </button>
                          <button
                            className="danger"
                            onClick={(e) => {
                              closeMenu(e.currentTarget);
                              remove(r);
                            }}
                          >
                            Delete
                          </button>
                        </div>
                      </details>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </nav>

      <main className="main">
        {doc && template ? (
          <Stage key={doc._id} template={template} data={doc.data} frameRef={frameRef} />
        ) : rows && !rows.length ? (
          <div className="empty">
            <h2>No compositions yet</h2>
            <p>Start from a template. Everything you make is saved to Sanity.</p>
            <button className="btn primary" onClick={() => setChoosing(true)}>
              New composition
            </button>
          </div>
        ) : doc && !template ? (
          <div className="empty">
            <h2>Unknown template “{doc.template}”</h2>
          </div>
        ) : (
          <div className="empty">
            <p>Loading…</p>
          </div>
        )}
      </main>

      {doc && template && (
        <Controls template={template} data={doc.data} onChange={edit} onPickImage={(apply) => setPicker(() => apply)}>
          <Exports items={exports} />
        </Controls>
      )}
      {choosing && (
        <NewComposition
          onClose={() => setChoosing(false)}
          onPick={(id) => {
            setChoosing(false);
            create(id);
          }}
        />
      )}

      {picker && (
        <MediaPicker
          client={client}
          onClose={() => setPicker(null)}
          onPick={(v) => {
            picker(v);
            setPicker(null);
          }}
        />
      )}
      {exporting && doc && template && (
        <ExportDialog title={doc.title} template={template} data={doc.data} frame={frameRef.current} onSave={saveExport} onClose={() => setExporting(false)} />
      )}
    </div>
  );
}

const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "composition";

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

function closeMenu(el: HTMLElement) {
  const d = el.closest("details");
  if (d) d.open = false;
}
