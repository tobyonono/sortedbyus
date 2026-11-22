import { useCallback, useEffect, useRef, useState } from "react";
import type { SanityClient } from "@sanity/client";
import { useToast } from "@sanity/ui/toast";
import { aspectLabel, compositionSource, FORMAT_KEYS, normalise, templateField, type BaseData, type FormatKey } from "../../engine";
import { download, exportVideo } from "./exporter";
import { applyPhoto, Controls, type PhotoTarget } from "./Controls";
import { ExportDialog, type ExportMeta } from "./ExportDialog";
import { Exports, type SavedExport } from "./Exports";
import { NewComposition } from "./NewComposition";
import { MediaPicker } from "./MediaPicker";
import { Stage } from "./Stage";
import { templateById, TEMPLATES } from "./templates";
import { baseId, isDraft, readComposition, slugify, type Doc, type StoredDoc } from "./compositions";
import { Campaigns } from "./Campaigns";
import { LibraryView, type Campaign, type LibraryFilter } from "./LibraryView";
import { pushRecent, readRecents, type RecentItem } from "./recents";
import { compositionLinks } from "./links";
import { SiteServices, useLoadSiteServices } from "./siteServices";
import { ReelEditor } from "./ReelEditor";
import { uploadAsset } from "./uploadAsset";

const TYPE = "motionComposition";

/** One composition in the list. `_id` is what opens: the draft if there is one. */
type Row = { _id: string; title: string; template: string; _updatedAt: string; screens?: number; draft: boolean; published: boolean };
type ReelRow = { _id: string; title: string; _updatedAt?: string; screens: number; draft: boolean };

// Links: ?c=<id> opens a composition; &export=story,portrait renders those formats
// on load and saves them to Sanity (for agents with a browser, or a person).
const onMotion = /\/motion|\/harness\.html$/.test(window.location.pathname);
const params = new URLSearchParams(onMotion ? window.location.search : "");
const linkedId = params.get("c");
const linkedReelId = params.get("r");
const linkedExport = params.get("export")?.split(",").filter((f): f is FormatKey => (FORMAT_KEYS as string[]).includes(f)) ?? [];
const linkedDownload = params.get("download") === "1";
type Save = "saved" | "saving" | "unsaved" | "error";
type PhotoSelection = PhotoTarget & { documentId: string };


/** The whole motion studio. `client` is the signed-in user's Sanity client from the host (the Studio tool). */
export function Studio({ client }: { client: SanityClient }) {
  const siteServices = useLoadSiteServices(client);
  const [rows, setRows] = useState<Row[] | null>(null);
  // Reels: a separate document type that sequences compositions.
  const [reelRows, setReelRows] = useState<ReelRow[] | null>(null);
  // A just-created reel or composition: its name field is focused so it gets a real name.
  const [nameFocus, setNameFocus] = useState<string | null>(null);
  // Library sidebar: search, the All videos view, campaigns and your recents.
  const [query, setQuery] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  const [library, setLibrary] = useState<{ filter: LibraryFilter; title: string } | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [recents, setRecents] = useState<RecentItem[]>(() => readRecents());
  const [reelId, setReelId] = useState<string | null>(null);
  const [usedIn, setUsedIn] = useState<{ _id: string; title: string }[]>([]);
  const [doc, setDoc] = useState<Doc | null>(null);
  const [save, setSave] = useState<Save>("saved");
  // Bumped on each successful save so the "Saved" note replays its fade.
  const [savedTick, setSavedTick] = useState(0);
  const [past, setPast] = useState<BaseData[]>([]);
  const [future, setFuture] = useState<BaseData[]>([]);
  const [picker, setPicker] = useState<PhotoSelection | null>(null);
  const [exporting, setExporting] = useState(false);
  const [choosing, setChoosing] = useState(false);
  const [exports, setExports] = useState<{ id: string; items: SavedExport[] | null } | null>(null);
  const [publishing, setPublishing] = useState(false);
  // Messages use the Studio's own toasts (Sanity UI), so they sit with Sanity's.
  const toast = useToast();
  const fail = useCallback(
    (title: string, e: unknown) => toast.push({ status: "error", title, description: String((e as Error)?.message ?? e), closable: true, duration: 8000 }),
    [toast],
  );
  const frameRef = useRef(0);
  const latest = useRef<Doc | null>(null);
  const pending = useRef<Doc | null>(null);
  const saving = useRef<Promise<boolean> | null>(null);
  const openRequest = useRef(0);
  const exportRequest = useRef(0);
  const publishingRef = useRef(false);

  const refresh = useCallback(
    () =>
      client
        .fetch<Omit<Row, "draft" | "published">[]>(
          `*[_type == $t] | order(_updatedAt desc){_id, title, template, _updatedAt, "screens": coalesce(count(sortFlash.beats), count(cardJourney.stops), count(titleCard.lines), count(photoMosaic.tiles), count(wordRoll.words), count(data.beats), count(data.stops))}`,
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
        .then(() =>
          client.fetch<Omit<ReelRow, "draft">[]>(`*[_type == "motionReel"] | order(_updatedAt desc){_id, title, _updatedAt, "screens": count(screens)}`),
        )
        .then((reels) => {
          if (!reels) return;
          const byBase = new Map<string, ReelRow>();
          for (const r of reels) {
            const key = baseId(r._id);
            if (!byBase.has(key) || isDraft(r._id)) byBase.set(key, { ...r, draft: isDraft(r._id) });
          }
          setReelRows([...byBase.values()]);
        })
        .then(() =>
          client
            .fetch<Campaign[]>(`*[_type == "campaign" && !(_id in path("drafts.**"))] | order(startDate desc){_id, title, status, "motion": coalesce(motion[]._ref, [])}`)
            .then((c) => setCampaigns(c ?? []))
            .catch(() => setCampaigns([])),
        )
        .catch((e) => fail("Couldn’t load compositions", e)),
    [client, fail],
  );

  useEffect(() => {
    refresh();
  }, [refresh]);

  /** Drain pending edits in order. A failed write leaves the latest snapshot available to retry. */
  const saveNow = useCallback((): Promise<boolean> => {
    if (saving.current) return saving.current;
    if (!pending.current) return Promise.resolve(true);
    setSave("saving");
    const flush = async () => {
      try {
        while (pending.current) {
          const d = pending.current;
          await client
            .patch(d._id)
            .set({ title: d.title, [templateField(d.template)]: d.data, ...compositionLinks(d.template, d.data) })
            .unset(["data"])
            .commit();
          if (pending.current === d) pending.current = null;
          setRows((r) => r?.map((x) => (x._id === d._id ? { ...x, title: d.title } : x)) ?? r);
        }
        setSave("saved");
        setSavedTick((n) => n + 1);
        return true;
      } catch (e) {
        setSave("error");
        fail("Couldn’t save", e);
        return false;
      }
    };
    saving.current = flush().finally(() => { saving.current = null; });
    return saving.current;
  }, [client, fail]);

  const loadExports = useCallback(async (id: string) => {
    if (latest.current?._id !== id) return;
    const request = ++exportRequest.current;
    try {
      const r = await client.fetch<{ exports?: SavedExport[] } | null>(
        `*[_id == $id][0]{"exports": exports[]{_key, format, fps, seconds, createdAt, filename, approvedFor, "url": file.asset->url, "size": file.asset->size}}`,
        { id },
      );
      if (latest.current?._id === id && request === exportRequest.current) setExports({ id, items: r?.exports ?? [] });
    } catch (e) {
      if (latest.current?._id === id && request === exportRequest.current) {
        setExports({ id, items: null });
        fail("Couldn’t load exports", e);
      }
    }
  }, [client, fail]);

  const select = useCallback((next: Doc) => {
    setRecents(pushRecent({ id: baseId(next._id), kind: "composition" }));
    latest.current = next;
    setDoc(next);
    setPicker(null);
    setExporting(false);
    setExports(null);
    void loadExports(next._id);
    const url = new URL(window.location.href);
    url.searchParams.set("c", baseId(next._id));
    url.searchParams.delete("r");
    setReelId(null);
    window.history.replaceState(window.history.state, "", url);
    setPast([]);
    setFuture([]);
    setSave("saved");
  }, [loadExports]);

  const open = useCallback(
    async (id: string) => {
      if (publishingRef.current) return;
      setLibrary(null);
      const request = ++openRequest.current;
      if (!(await saveNow()) || request !== openRequest.current || latest.current?._id === id) return;
      const d = await client.getDocument<StoredDoc>(id).catch((e) => (fail("Couldn’t open that composition", e), undefined));
      if (!d || request !== openRequest.current) return;
      // Edits can arrive while the next composition is loading.
      while (pending.current) {
        if (!(await saveNow()) || request !== openRequest.current) return;
      }
      select(readComposition(d));
    },
    [client, saveNow, select, fail],
  );

  /** Upload an exported MP4 to Sanity and list it on the composition. */
  async function saveExport(id: string, blob: Blob, meta: ExportMeta, signal?: AbortSignal) {
    const asset = await uploadAsset(client, "file", blob, { filename: meta.filename, contentType: "video/mp4" }, signal);
    signal?.throwIfAborted();
    await client
      .patch(id)
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
      .commit({ signal });
    void loadExports(id);
  }

  useEffect(() => {
    if (!rows?.length || doc || reelId || linkedReelId) return;
    const linked = linkedId && rows.find((r) => baseId(r._id) === baseId(linkedId));
    open(linked ? linked._id : rows[0]._id);
  }, [rows, doc, open, reelId]);

  /** Open a reel: save the open composition, then hand over to the reel editor. */
  const openReel = useCallback(
    async (id: string) => {
      if (!(await saveNow())) return;
      setLibrary(null);
      setRecents(pushRecent({ id: baseId(id), kind: "reel" }));
      ++openRequest.current;
      latest.current = null;
      setDoc(null);
      setPicker(null);
      setExporting(false);
      setReelId(id);
      const url = new URL(window.location.href);
      url.searchParams.set("r", baseId(id));
      url.searchParams.delete("c");
      window.history.replaceState(window.history.state, "", url);
    },
    [saveNow],
  );

  // A reel link (?r=…) opens that reel once the list is loaded.
  const reelLinkDone = useRef(false);
  useEffect(() => {
    if (reelLinkDone.current || !linkedReelId || !reelRows) return;
    reelLinkDone.current = true;
    const row = reelRows.find((r) => baseId(r._id) === baseId(linkedReelId));
    if (row) void openReel(row._id);
    else fail("That reel wasn’t found", linkedReelId);
  }, [reelRows, openReel, fail]);

  const createReel = async () => {
    if (!(await saveNow())) return;
    const created = await client
      .create({ _type: "motionReel", title: uniqueName("New reel", (reelRows ?? []).map((r) => r.title)), format: "story", fps: 25, screens: [] })
      .catch((e) => (fail("Couldn’t create the reel", e), null));
    if (!created) return;
    await refresh();
    setNameFocus(created._id);
    void openReel(created._id);
  };

  const removeReel = async (row: { _id: string; title: string }) => {
    if (!confirm(`Delete the reel “${row.title}”? Its compositions stay; exported videos stay in the media library.`)) return;
    try {
      await client.transaction().delete(baseId(row._id)).delete(`drafts.${baseId(row._id)}`).commit();
    } catch (e) {
      return fail("Couldn’t delete the reel", e);
    }
    if (reelId && baseId(reelId) === baseId(row._id)) setReelId(null);
    toast.push({ status: "success", title: `Deleted “${row.title}”` });
    void refresh();
  };

  const duplicateReel = async (row: { _id: string }) => {
    const d = await client.getDocument<Record<string, unknown>>(row._id).catch((e) => (fail("Couldn’t duplicate the reel", e), undefined));
    if (!d) return;
    const created = await client
      .create({ _type: "motionReel", title: `${d.title} copy`, format: d.format, fps: d.fps, screens: d.screens ?? [] })
      .catch((e) => (fail("Couldn’t duplicate the reel", e), null));
    if (!created) return;
    await refresh();
    void openReel(created._id);
  };

  // "/" jumps to search (unless you're typing somewhere).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "/" || e.metaKey || e.ctrlKey || e.altKey) return;
      const el = e.target instanceof Element ? e.target : null;
      if (el?.closest("input, textarea, select, [contenteditable]") || document.querySelector(".studio .modal-scrim[open]")) return;
      e.preventDefault();
      searchRef.current?.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Which reels use the open composition (so edits to it are visible as shared).
  useEffect(() => {
    if (!doc) return setUsedIn([]);
    const id = baseId(doc._id);
    let live = true;
    client
      .fetch<{ _id: string; title: string }[]>(`*[_type == "motionReel" && (references($id) || references($draft))]{_id, title}`, { id, draft: `drafts.${id}` })
      .then((r) => live && setUsedIn([...new Map(r.map((x) => [baseId(x._id), x])).values()]))
      .catch(() => live && setUsedIn([]));
    return () => {
      live = false;
    };
  }, [client, doc?._id]); // eslint-disable-line react-hooks/exhaustive-deps

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
          const source = compositionSource(t, doc.data);
          const blob = await exportVideo(source, {
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
          await saveExport(doc._id, blob, { format, fps: doc.data.fps, seconds: source(format, doc.data.fps).frames() / doc.data.fps, filename });
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
    if (!doc || pending.current !== doc) return;
    const t = setTimeout(saveNow, 700);
    return () => clearTimeout(t);
  }, [doc, saveNow]);

  useEffect(() => {
    const warnBeforeLeaving = (event: BeforeUnloadEvent) => {
      if (!pending.current) return;
      event.preventDefault();
      event.returnValue = true;
    };
    window.addEventListener("beforeunload", warnBeforeLeaving);
    return () => {
      window.removeEventListener("beforeunload", warnBeforeLeaving);
      ++openRequest.current;
      ++exportRequest.current;
      void saveNow();
    };
  }, [saveNow]);

  const update = (next: Doc) => {
    latest.current = next;
    pending.current = next;
    if (!saving.current) setSave("unsaved");
    setDoc(next);
  };
  const edit = (data: BaseData) => {
    const current = latest.current;
    if (!current || publishingRef.current) return;
    setPast((p) => [...p.slice(-80), current.data]);
    setFuture([]);
    update({ ...current, data });
  };
  const rename = (title: string) => {
    const current = latest.current;
    if (!current || publishingRef.current) return;
    update({ ...current, title });
  };
  const undo = () => {
    if (!doc || !past.length || publishingRef.current) return;
    setFuture((f) => [doc.data, ...f]);
    update({ ...doc, data: past[past.length - 1] });
    setPast((p) => p.slice(0, -1));
  };
  const redo = () => {
    if (!doc || !future.length || publishingRef.current) return;
    setPast((p) => [...p, doc.data]);
    update({ ...doc, data: future[0] });
    setFuture((f) => f.slice(1));
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.key.toLowerCase() !== "z") return;
      if (document.querySelector(".studio .modal-scrim[open]")) return;
      if (e.target instanceof Element && e.target.closest("input, textarea")) return;
      e.preventDefault();
      if (e.shiftKey) redo();
      else undo();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const create = async (templateId: string, from?: Doc) => {
    if (publishingRef.current || !(await saveNow())) return;
    const t = templateById(templateId)!;
    const created = await client
      .create({
        _type: TYPE,
        title: uniqueName(from ? `${from.title} copy` : t.name, (rows ?? []).map((r) => r.title)),
        template: t.id,
        [templateField(t.id)]: from ? from.data : t.defaults,
        ...compositionLinks(t.id, from ? from.data : t.defaults),
      })
      .catch((e) => (fail("Couldn’t create the composition", e), null));
    if (!created) return;
    await refresh();
    setNameFocus(created._id);
    open(created._id);
  };

  const remove = async (row: Row) => {
    if (publishingRef.current) return;
    const reels = await client
      .fetch<{ title: string }[]>(`*[_type == "motionReel" && (references($id) || references($draft))]{title}`, { id: baseId(row._id), draft: `drafts.${baseId(row._id)}` })
      .catch(() => []);
    const inReels = reels.length ? ` It’s used in ${reels.length === 1 ? "the reel" : `${reels.length} reels`} ${reels.map((r) => `“${r.title}”`).join(", ")}, which will show a gap where it was.` : "";
    if (!confirm(`Delete “${row.title}”?${inReels} Exports you've downloaded are not affected.`)) return;
    try {
      await client.transaction().delete(baseId(row._id)).delete(`drafts.${baseId(row._id)}`).commit();
    } catch (e) {
      return fail("Couldn’t delete it", e);
    }
    if (latest.current && baseId(latest.current._id) === baseId(row._id)) {
      ++openRequest.current;
      latest.current = null;
      pending.current = null;
      setRows((previous) => previous?.filter((item) => baseId(item._id) !== baseId(row._id)) ?? previous);
      setDoc(null);
      setPicker(null);
      setExporting(false);
    }
    toast.push({ status: "success", title: `Deleted “${row.title}”`, description: "Videos already exported stay in the media library." });
    refresh();
  };

  /** Publish a draft (e.g. one an agent made): it becomes the composition, the draft goes. */
  const publish = async () => {
    const current = latest.current;
    if (!current || !isDraft(current._id) || publishingRef.current) return;
    const id = baseId(current._id);
    publishingRef.current = true;
    setPublishing(true);
    ++openRequest.current;
    try {
      if (!(await saveNow())) return;
      const draft = await client.getDocument<StoredDoc>(current._id);
      if (!draft) throw new Error("The draft no longer exists.");
      const { _id, _rev, _createdAt, _updatedAt, ...rest } = draft;
      void _id;
      void _rev;
      void _createdAt;
      void _updatedAt;
      await client.transaction().createOrReplace({ ...rest, _id: id, _type: TYPE }).delete(current._id).commit();
      select(readComposition({ ...draft, _id: id }));
      toast.push({ status: "success", title: `Published “${current.title}”` });
      void refresh();
    } catch (e) {
      return fail("Couldn’t publish", e);
    } finally {
      publishingRef.current = false;
      setPublishing(false);
    }
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


  // ---------- library sidebar: rows, search, recent, review ----------
  const reelItem = (r: ReelRow) => (
    <li key={r._id} className={!library && reelId && baseId(reelId) === baseId(r._id) ? "is-on" : ""}>
                    <button className="comp" onClick={() => void openReel(r._id)}>
                      <span className="comp-text">
                        <strong>
                          <span className="comp-title">{r.title}</span>
                        </strong>
                        <RowMeta parts={[r.screens ? countLabel("reel", r.screens) : "Empty"]} status={r.draft ? "Draft" : null} updatedAt={r._updatedAt} />
                      </span>
                    </button>
                    <details className="comp-menu">
                      <summary aria-label="More">⋯</summary>
                      <div>
                        <button
                          onClick={(e) => {
                            closeMenu(e.currentTarget);
                            void duplicateReel(r);
                          }}
                        >
                          Duplicate
                        </button>
                        <button
                          className="danger"
                          onClick={(e) => {
                            closeMenu(e.currentTarget);
                            void removeReel(r);
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    </details>
                  </li>
  );
  const compItem = (r: Row) => {
    const t = templateById(r.template);
    if (!t) return null;
    return (
      <li key={r._id} className={!library && doc && baseId(doc._id) === baseId(r._id) ? "is-on" : ""}>
                      <button className="comp" onClick={() => open(r._id)}>
                        <span className="comp-text">
                          <strong>
                            <span className="comp-title">{r.title}</span>
                          </strong>
                          <RowMeta
                            parts={r.screens ? [countLabel(t.id, r.screens)] : []}
                            status={r.draft ? (r.published ? "Unpublished changes" : "Draft") : null}
                            updatedAt={r._updatedAt}
                          />
                        </span>
                      </button>
                      <details className="comp-menu">
                        <summary aria-label="More">⋯</summary>
                        <div>
                          <button
                            onClick={async (e) => {
                              closeMenu(e.currentTarget);
                              if (!(await saveNow())) return;
                              const d = await client.getDocument<StoredDoc>(r._id)
                                .catch((error) => (fail("Couldn’t duplicate the composition", error), undefined));
                              if (d && templateById(d.template)) create(d.template, readComposition(d));
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
    );
  };

  type Entry = { kind: "reel" | "composition"; row: Row | ReelRow };
  const entries: Entry[] = [
    ...(reelRows ?? []).map((row) => ({ kind: "reel" as const, row })),
    ...(rows ?? []).map((row) => ({ kind: "composition" as const, row })),
  ];
  const totalCount = entries.length;
  const reviewCount = entries.filter((e) => e.row.draft).length;
  const q = query.trim().toLowerCase();
  const results = q
    ? entries
        .filter((e) => `${e.row.title} ${e.kind === "reel" ? "reel" : templateById((e.row as Row).template)?.name ?? ""}`.toLowerCase().includes(q))
        .slice(0, 50)
    : [];
  // What you opened in this browser first, then topped up with the most recently edited.
  const recentItems = (() => {
    const byId = new Map(entries.map((e) => [baseId(e.row._id), e]));
    const mine = recents.map((r) => byId.get(baseId(r.id))).filter((x): x is Entry => !!x);
    const latest = [...entries].sort((a, b) => (b.row._updatedAt ?? "").localeCompare(a.row._updatedAt ?? ""));
    return [...mine, ...latest.filter((e) => !mine.includes(e))].slice(0, 5);
  })();
  const activeCampaigns = campaigns.filter((c) => c.status !== "done").slice(0, 6);
  const openLibrary = (filter: LibraryFilter, title: string) => {
    void saveNow().then((ok) => ok && setLibrary({ filter, title }));
  };

  return (
    <SiteServices.Provider value={siteServices}>
    <div className="studio">
      {library ? (
        <LibraryView
          client={client}
          filter={library.filter}
          title={library.title}
          campaigns={campaigns}
          onFilter={(filter) => setLibrary((l) => (l ? { ...l, filter } : l))}
          onOpen={(id, kind) => {
            setLibrary(null);
            if (kind === "reel") void openReel(id);
            else void open(id);
          }}
        />
      ) : reelId ? (
        <ReelEditor
            focusName={!!nameFocus && !!reelId && baseId(nameFocus) === baseId(reelId)}
            onNameFocused={() => setNameFocus(null)}
          key={reelId}
          client={client}
          id={reelId}
          onOpenComposition={(id) => {
            setReelId(null);
            void open(id);
          }}
          onChanged={refresh}
          autoExport={linkedReelId && baseId(reelId) === baseId(linkedReelId) ? linkedExport : undefined}
          autoDownload={linkedDownload}
        />
      ) : (
      <header className="topbar">
        <div className="topbar-left">
          <div className="brand-mark">
            <span>Motion</span>
          </div>
          {doc ? (
            <input
              key={doc._id}
              className="title-input"
              value={doc.title}
              onChange={(e) => rename(e.target.value)}
              aria-label="Composition name"
              disabled={publishing}
              ref={(el) => {
                if (el && nameFocus && baseId(nameFocus) === baseId(doc._id)) {
                  el.focus();
                  el.select();
                  setNameFocus(null);
                }
              }}
            />
          ) : (
            <span className="title-input" />
          )}
          <span className="save-slot" aria-live="polite">
            {save === "unsaved" || save === "saving" ? (
              <span className="save">Saving…</span>
            ) : save === "error" ? (
              <button className="btn ghost small save-error" onClick={saveNow}>Retry save</button>
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
                <button key={k} role="radio" aria-checked={doc.data.format === k} className={doc.data.format === k ? "is-on" : ""} disabled={publishing} onClick={() => edit({ ...doc.data, format: k })}>
                  {aspectLabel(k)}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="topbar-right">
          {doc && isDraft(doc._id) && (
            <button className="btn ghost" onClick={publish} disabled={publishing} title="Drafts come from agents or unpublished edits. Publishing makes this the composition.">
              {publishing ? "Publishing…" : "Publish draft"}
            </button>
          )}
          <button className="icon-btn" onClick={undo} disabled={publishing || !past.length} aria-label="Undo">
            <svg viewBox="0 0 16 16"><path d="M6 4 3 7l3 3M3 7h6.5a3.5 3.5 0 0 1 0 7H8" /></svg>
          </button>
          <button className="icon-btn" onClick={redo} disabled={publishing || !future.length} aria-label="Redo">
            <svg viewBox="0 0 16 16"><path d="m10 4 3 3-3 3m3-3H6.5a3.5 3.5 0 0 0 0 7H8" /></svg>
          </button>
          <button className="btn primary" disabled={!template || publishing} onClick={() => setExporting(true)}>
            <svg viewBox="0 0 16 16" aria-hidden><path d="M8 2v8m-3.5-3.5L8 10l3.5-3.5M3 13h10" /></svg>
            Export
          </button>
        </div>
      </header>
      )}

      <nav className="sidebar" inert={publishing}>
        <div className="sidebar-head">
          <h2>Library</h2>
          <button className="btn ghost small" onClick={() => setChoosing(true)}>
            <svg viewBox="0 0 16 16" aria-hidden><path d="M8 3v10M3 8h10" /></svg>
            New
          </button>
        </div>
        <div className="side-search">
          <svg viewBox="0 0 16 16" aria-hidden><circle cx="7" cy="7" r="4.5" /><path d="m10.5 10.5 3 3" /></svg>
          <input
            ref={searchRef}
            className="input"
            placeholder="Search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Escape" && (setQuery(""), e.currentTarget.blur())}
            aria-label="Search the library"
          />
          {!query && <kbd>/</kbd>}
        </div>
        <div className="comp-groups">
          {query.trim() ? (
            <div className="comp-group">
              <h3 className="comp-group-title">{results.length ? `${results.length} found` : "Nothing found"}</h3>
              <ul className="comp-list">{results.map((x) => (x.kind === "reel" ? reelItem(x.row as ReelRow) : compItem(x.row as Row)))}</ul>
            </div>
          ) : (
            <>
              <ul className="comp-list side-nav">
                <li className={library && !library.filter.status && !library.filter.campaign ? "is-on" : ""}>
                  <button className="comp" onClick={() => openLibrary({}, "All videos")}>
                    <svg className="side-icon" viewBox="0 0 16 16" aria-hidden><rect x="2.5" y="2.5" width="4.5" height="4.5" rx="1" /><rect x="9" y="2.5" width="4.5" height="4.5" rx="1" /><rect x="2.5" y="9" width="4.5" height="4.5" rx="1" /><rect x="9" y="9" width="4.5" height="4.5" rx="1" /></svg>
                    <span className="comp-title">All videos</span>
                    <span className="side-count">{totalCount}</span>
                  </button>
                </li>
                <li className={library?.filter.status === "review" ? "is-on" : ""}>
                  <button className="comp" onClick={() => openLibrary({ status: "review" }, "Needs review")}>
                    <svg className="side-icon" viewBox="0 0 16 16" aria-hidden><circle cx="8" cy="8" r="5.5" /><path d="M8 5v3.5l2 1.5" /></svg>
                    <span className="comp-title">Needs review</span>
                    {!!reviewCount && <span className="side-count badge">{reviewCount}</span>}
                  </button>
                </li>
              </ul>

              <div className="comp-group">
                <h3 className="comp-group-title">Recent</h3>
                <ul className="comp-list">{recentItems.map((x) => (x.kind === "reel" ? reelItem(x.row as ReelRow) : compItem(x.row as Row)))}</ul>
              </div>

              <div className="comp-group">
                <h3 className="comp-group-title">Campaigns</h3>
                <ul className="comp-list side-nav">
                  {activeCampaigns.map((c) => (
                    <li key={c._id} className={library?.filter.campaign === c._id ? "is-on" : ""}>
                      <button className="comp" onClick={() => openLibrary({ campaign: c._id }, c.title)}>
                        <span className="side-dot" aria-hidden />
                        <span className="comp-title">{c.title}</span>
                        <span className="side-count">{c.motion.length}</span>
                      </button>
                    </li>
                  ))}
                  <li>
                    <a className="comp side-link" href="/studio/structure/campaign" target="_top">
                      <svg className="side-icon" viewBox="0 0 16 16" aria-hidden><path d="M3 4.5h10M3 8h10M3 11.5h6" /></svg>
                      <span className="comp-title">{activeCampaigns.length ? "All campaigns" : "Make a campaign"}</span>
                    </a>
                  </li>
                </ul>
              </div>
            </>
          )}
        </div>
      </nav>

      {!reelId && !library && (
      <main className="main">
        {doc && template ? (
          <Stage key={doc._id} playable={compositionSource(template, doc.data)(doc.data.format, doc.data.fps)} frameRef={frameRef} />
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
      )}

      {!library && doc && template && (
        <Controls
          template={template}
          data={doc.data}
          onChange={edit}
          inert={publishing}
          onPickImage={(target) => setPicker({ ...target, documentId: doc._id })}
        >
          {!!usedIn.length && (
            <section className="section">
              <div className="section-head static">
                <span>Used in reels</span>
                <span className="field-value">{usedIn.length}</span>
              </div>
              <div className="section-body">
                <p className="hint">Changes here show up in {usedIn.length === 1 ? "this reel" : "these reels"} too.</p>
                <div className="btn-row">
                  {usedIn.map((r) => (
                    <button key={r._id} className="btn ghost small" onClick={() => void openReel(r._id)}>
                      {r.title}
                    </button>
                  ))}
                </div>
              </div>
            </section>
          )}
          <Campaigns client={client} id={doc._id} kind="composition" />
          <Exports
            items={exports?.id === doc._id ? exports.items : undefined}
            onApprove={(key, channels) => {
              const id = doc._id;
              setExports((x) => (x?.id === id && x.items ? { id, items: x.items.map((e) => (e._key === key ? { ...e, approvedFor: channels } : e)) } : x));
              client
                .patch(id)
                .set({ [`exports[_key=="${key}"].approvedFor`]: channels })
                .commit()
                .catch((e) => fail("Couldn’t save the approval", e));
            }}
          />
        </Controls>
      )}
      {choosing && (
        <NewComposition
          onPickReel={() => {
            setChoosing(false);
            void createReel();
          }}
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
            setPicker(null);
            const current = latest.current;
            if (current?._id !== picker.documentId) return;
            const data = applyPhoto(current.data, picker, v);
            if (data !== current.data) edit(data);
          }}
        />
      )}
      {exporting && doc && template && (
        <ExportDialog
          title={doc.title}
          source={compositionSource(template, doc.data)}
          format={doc.data.format}
          fps={doc.data.fps}
          frame={frameRef.current}
          onSave={async (blob, meta, signal) => {
            await saveExport(doc._id, blob, meta, signal);
            toast.push({ status: "success", title: `Saved ${aspectLabel(meta.format)} to Sanity`, description: "It’s listed under Exports." });
          }}
          onClose={() => setExporting(false)}
        />
      )}
    </div>
    </SiteServices.Provider>
  );
}


function closeMenu(el: HTMLElement) {
  const d = el.closest("details");
  if (d) d.open = false;
}

/** "3 photos", "1 line": what a composition's list holds, under its name in the library. */
const UNITS: Record<string, [string, string]> = {
  reel: ["screen", "screens"],
  "sort-flash": ["screen", "screens"],
  "card-journey": ["stop", "stops"],
  "title-card": ["line", "lines"],
  "photo-mosaic": ["photo", "photos"],
  "word-roll": ["word", "words"],
};
function countLabel(kind: string, n: number) {
  const [one, many] = UNITS[kind] ?? ["item", "items"];
  return `${n} ${n === 1 ? one : many}`;
}

/** "New reel", or "New reel 2" (3, 4…) if that name is taken. */
function uniqueName(base: string, taken: string[]) {
  const names = new Set(taken.map((t) => t.trim().toLowerCase()));
  if (!names.has(base.toLowerCase())) return base;
  let n = 2;
  while (names.has(`${base} ${n}`.toLowerCase())) n++;
  return `${base} ${n}`;
}

/** "just now", "5 min", "3 h", "2 d", then the date. */
function ago(iso?: string) {
  if (!iso) return "";
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  if (s < 7 * 86400) return `${Math.floor(s / 86400)} d ago`;
  return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

/** The second line of a library row: what it holds, its draft status, when it was last edited. */
function RowMeta({ parts, status, updatedAt }: { parts: string[]; status: string | null; updatedAt?: string }) {
  const when = ago(updatedAt);
  return (
    <small className="comp-meta">
      {status && <em className="badge">{status}</em>}
      {[...parts, when].filter(Boolean).join(" · ")}
    </small>
  );
}
