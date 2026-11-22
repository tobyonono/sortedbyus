// Dev-only page (localhost:3333/harness.html): the stage, controls and exporter
// with local data and no Sanity login. For checking templates and export.
// ?format=story&frame=50 picks a format and a paused frame; ?export=1 runs an MP4 export;
// ?view=home shows the Studio landing page; ?template=card-journey picks a template;
// ?view=new shows the template picker; ?spring=1 opens the spring editor;
// ?view=studio runs the real studio against an in-memory Sanity (try &c=agent1&export=square).
import { LayerProvider, studioTheme, ThemeProvider } from "@sanity/ui";
import { ToastProvider } from "@sanity/ui/toast";
import { StrictMode, useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import type { BaseData, FormatKey } from "../../engine";
import { createClient } from "@sanity/client";
import { applyPhoto, Controls } from "./Controls";
import { MediaPicker } from "./MediaPicker";
import { Studio } from "./Studio";
import { fakeSanity } from "./fakeSanity";
import { NewComposition } from "./NewComposition";
import { SpringEditor } from "./SpringEditor";
import { compositionSource, normaliseReel, reelSource, springPreset } from "../../engine";
import { PlayablePreview } from "./PlayablePreview";
import { preferDrafts, readComposition, sourceOf, type StoredDoc } from "./compositions";
import { exportVideo } from "./exporter";
import { Stage } from "./Stage";
import { HomeCards } from "../../../src/lib/sanity/tools/home-cards";
import { TEMPLATES } from "./templates";
import "./studio.css";

const q = new URLSearchParams(location.search);
declare global {
  interface Window {
    __fake?: ReturnType<typeof fakeSanity>;
  }
}
const template = TEMPLATES.find((t) => t.id === q.get("template")) ?? TEMPLATES[0];

function Harness() {
  const [data, setData] = useState<BaseData>({ ...template.defaults, format: (q.get("format") as FormatKey) ?? template.defaults.format });
  const frameRef = useRef(0);
  // Read-only client for the public dataset, so the photo picker works here too (uploads need the Studio).
  const [client] = useState(() => createClient({ projectId: "g0dqg5p9", dataset: "production", apiVersion: "2025-02-19", useCdn: true }));
  const [picker, setPicker] = useState<((v: string) => void) | null>(() => (q.get("picker") ? () => {} : null));

  useEffect(() => {
    if (!q.get("export")) return;
    const t0 = performance.now();
    exportVideo(compositionSource(template, data), {
      format: data.format,
      fps: data.fps,
      quality: "high",
      repeat: 1,
      onProgress: (p) => (document.title = `EXPORTING ${Math.round(p * 100)}%`),
    })
      .then((b) => (document.title = `EXPORT OK ${b.size} bytes in ${Math.round(performance.now() - t0)}ms`))
      .catch((e) => (document.title = `EXPORT FAIL ${e}`));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="studio">
      <header className="topbar">
        <div className="topbar-left">
          <div className="brand-mark">
            <span>Motion</span>
          </div>
          <input className="title-input" defaultValue={template.name} aria-label="Composition name" />
          <span className="save-slot">
            <span className="save save-saved">Saved</span>
          </span>
        </div>
        <div className="topbar-centre">
          <div className="seg formats-seg">
            {(["portrait", "story", "square", "landscape"] as FormatKey[]).map((k) => (
              <button key={k} className={data.format === k ? "is-on" : ""} onClick={() => setData({ ...data, format: k })}>
                {{ portrait: "4:5", story: "9:16", square: "1:1", landscape: "16:9" }[k]}
              </button>
            ))}
          </div>
        </div>
        <div className="topbar-right">
          <button className="btn primary">
            <svg viewBox="0 0 16 16" aria-hidden><path d="M8 2v8m-3.5-3.5L8 10l3.5-3.5M3 13h10" /></svg>
            Export
          </button>
        </div>
      </header>
      <nav className="sidebar">
        <div className="sidebar-head">
          <h2>Compositions</h2>
          <button className="icon-btn" aria-label="New composition">
            <svg viewBox="0 0 16 16"><path d="M8 3v10M3 8h10" /></svg>
          </button>
        </div>
        <ul className="comp-list">
          {[
            ["Sort flash — launch", "9 screens", true],
            ["Sort flash — weddings", "5 screens", false],
            ["Sort flash — story cut", "6 screens", false],
          ].map(([t, s, on]) => (
            <li key={t as string} className={on ? "is-on" : ""}>
              <button className="comp">
                <span className="comp-icon" aria-hidden>
                  <svg viewBox="0 0 16 16"><path d="M2.5 3.5h11v9h-11zM5.5 6.5h5M5.5 9.5h3" /></svg>
                </span>
                <span className="comp-text">
                  <strong>{t}</strong>
                  <small>Sort flash · {s}</small>
                </span>
              </button>
            </li>
          ))}
        </ul>
        <div className="sidebar-foot">
          <h3>Templates</h3>
          <button className="template-btn">
            <strong>+ Sort flash</strong>
            <small>Flash · text + photos</small>
          </button>
        </div>
      </nav>
      <main className="main">
        <Stage
          playable={compositionSource(template, data)(data.format, data.fps)}
          frameRef={frameRef}
          initialFrame={Number(q.get("frame") ?? 0)}
          autoplay={!q.has("frame")}
        />
      </main>
      <Controls template={template} data={data} onChange={setData} onPickImage={(target) => setPicker(() => (value: string) => {
        setData((current) => applyPhoto(current, target, value));
      })} />
      {q.get("view") === "new" && <NewComposition onPick={(id) => (document.title = `NEW ${id}`)} onClose={() => {}} />}
      {q.get("spring") && <SpringEditor value={springPreset("card")} onUse={() => {}} onClose={() => {}} />}
      {picker && (
        <MediaPicker
          client={client}
          initialTab={q.get("picker") === "library" ? "library" : "starter"}
          onClose={() => setPicker(null)}
          onPick={(v) => {
            picker(v);
            setPicker(null);
          }}
        />
      )}
    </div>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider theme={studioTheme}>
    <LayerProvider>
    <ToastProvider>
    <div style={{ display: "flex", height: "100vh" }}>
      {q.get("view") === "reelframes" ? (
        <ReelFrames />
      ) : q.get("view") === "studio" ? (
        <Studio
          client={
            (window.__fake ??= fakeSanity(harnessSeed())) as never
          }
        />
      ) : q.get("view") === "home" ? (
        <ThemeProvider theme={studioTheme}>
          <div style={{ flex: 1 }}>
            <HomeCards onOpen={(t) => (document.title = `OPEN ${t}`)} />
          </div>
        </ThemeProvider>
      ) : (
        <Harness />
      )}
    </div>
    </ToastProvider>
    </LayerProvider>
    </ThemeProvider>
  </StrictMode>,
);

/** ?view=reelframes&r=reel1&frames=60,70,80: stills of a seeded reel at given frames (open ?view=studio first to seed). */
function ReelFrames() {
  const fake = (window.__fake ??= fakeSanity(harnessSeed()));
  const docs = [...fake.store.values()];
  const comps = preferDrafts(docs.filter((d) => d._type === "motionComposition") as StoredDoc[]);
  const reel = normaliseReel(fake.store.get(q.get("r") ?? "reel1"));
  const source = reelSource(reel, (ref) => {
    const c = comps.get(ref);
    const doc = c && readComposition(c);
    const src = doc && sourceOf(doc);
    return doc && src ? { source: src, title: doc.title } : null;
  });
  const frames = (q.get("frames") ?? "0").split(",").map(Number);
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, padding: 12, background: "#222" }}>
      {frames.map((f) => (
        <div key={f} style={{ color: "#fff", font: "12px sans-serif" }}>
          <PlayablePreview playable={source(reel.format, reel.fps)} width={200} still={f} />
          <div>frame {f}</div>
        </div>
      ))}
    </div>
  );
}

/** Compositions and a reel for the fake Sanity (studio + reel views). */
function harnessSeed() {
  return [
              { _id: "old1", _type: "motionComposition", title: "Launch flash (old format)", template: "sort-flash", data: { lead: "Sort", beats: [{ _key: "a", word: "flowers", image: "gifts" }, { _key: "b", word: "a boat trip", image: "boat" }], wordMotion: "rise" } },
              { _id: "t1", _type: "motionComposition", title: "Intro: Consider it sorted", template: "title-card", titleCard: {} },
              { _id: "w1", _type: "motionComposition", title: "What we sort", template: "word-roll", wordRoll: { holdSeconds: 0.35 } },
              { _id: "p1", _type: "motionComposition", title: "Lunch for twelve", template: "photo-caption", photoCaption: {} },
              { _id: "m1", _type: "motionComposition", title: "Everything, sorted", template: "photo-mosaic", photoMosaic: { word: "Sorted.", holdSeconds: 1 } },
              { _id: "t2", _type: "motionComposition", title: "End line", template: "title-card", titleCard: { lines: [{ _key: "l1", text: "Sorted." }], typeSize: 16, align: "left", place: "bottom", colours: { background: "butter", text: "espresso" }, durationSeconds: 2.5 } },
              {
                _id: "reel2",
                _type: "motionReel",
                title: "Smart reel",
                format: "story",
                fps: 25,
                screens: [
                  { _key: "a", composition: { _type: "reference", _ref: "p1", _weak: true }, trimStart: 0, trimEnd: 0, transition: { type: "smart", seconds: 0.8, spring: { preset: "card" } } },
                  { _key: "b", composition: { _type: "reference", _ref: "m1", _weak: true }, trimStart: 0, trimEnd: 0, transition: { type: "smart", seconds: 0.8, spring: { preset: "card" } } },
                  { _key: "c", composition: { _type: "reference", _ref: "t2", _weak: true }, trimStart: 0, trimEnd: 0, transition: { type: "cut" } },
                ],
              },
              {
                _id: "reel1",
                _type: "motionReel",
                title: "Launch reel",
                format: "story",
                fps: 25,
                screens: [
                  { _key: "a", composition: { _type: "reference", _ref: "t1", _weak: true }, trimStart: 0, trimEnd: 0.5, transition: { type: "crossfade", seconds: 0.5, spring: { preset: "gentle" } } },
                  { _key: "b", composition: { _type: "reference", _ref: "old1", _weak: true }, trimStart: 0, trimEnd: 0, transition: { type: "push", direction: "left", seconds: 0.6, spring: { preset: "card" } } },
                  { _key: "c", composition: { _type: "reference", _ref: "w1", _weak: true }, trimStart: 0, trimEnd: 2, transition: { type: "slide", direction: "up", seconds: 0.6, spring: { preset: "snappy" } } },
                  { _key: "d", composition: { _type: "reference", _ref: "p1", _weak: true }, trimStart: 0, trimEnd: 0, transition: { type: "cut" } },
                  { _key: "e", composition: { _type: "reference", _ref: "gone", _weak: true }, trimStart: 0, trimEnd: 0, transition: { type: "cut" } },
                ],
              },
              {
                _id: "drafts.agent1",
                _type: "motionComposition",
                title: "Agent: services wall — little plans, sorted for the spring campaign",
                template: "card-journey",
                cardJourney: {
                  stops: [
                    { _key: "s1", label: "Gifts", request: "Flowers for Mum on Sunday", image: "gifts" },
                    { _key: "s2", label: "Travel", request: "A weekend away for two", image: "getaways" },
                  ],
                  fill: [{ _key: "f1", request: "Hang curtains in the new flat", colour: "red" }],
                  zoomIn: 9,
                  spring: { preset: "bouncy" },
                  colours: { background: "hotpink" },
                },
              },
            ] as Parameters<typeof fakeSanity>[0];
}
