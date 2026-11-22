// Spike page: localhost:3333/siteblock.html (npm run motion:harness).
// Renders the site's request card as a 5 s clip and tries two ways to turn it into an MP4:
//   (a) in the browser: each frame's DOM → SVG foreignObject → canvas → WebCodecs (?run=a runs it)
//   (b) headless Chrome steps frames and screenshots them; this page only encodes (window.__siteblock)
// ?bare=1 shows just the clip at 1:1 for screenshots; ?compare=N shows frame N as DOM and as route (a).
import "../../../../src/styles/globals.css";
import { StrictMode, useEffect, useRef, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { flushSync } from "react-dom";
import { BufferTarget, CanvasSource, getFirstEncodableVideoCodec, Mp4OutputFormat, Output, QUALITY_HIGH } from "mediabunny";
import { loadFonts } from "../media";
import { CLIP, CLIP_FRAMES, RequestCardClip } from "./RequestCardClip";
import { domRasterizer } from "./domFrame";

const q = new URLSearchParams(location.search);

async function encoder() {
  const canvas = document.createElement("canvas");
  canvas.width = CLIP.width;
  canvas.height = CLIP.height;
  const ctx = canvas.getContext("2d", { alpha: false })!;
  const codec = await getFirstEncodableVideoCodec(["avc", "hevc", "vp9", "av1"], { width: CLIP.width, height: CLIP.height });
  if (!codec) throw new Error("no encoder");
  const output = new Output({ format: new Mp4OutputFormat({ fastStart: "in-memory" }), target: new BufferTarget() });
  const source = new CanvasSource(canvas, { codec, bitrate: QUALITY_HIGH });
  output.addVideoTrack(source, { frameRate: CLIP.fps });
  await output.start();
  return {
    canvas,
    ctx,
    add: (i: number) => source.add(i / CLIP.fps, 1 / CLIP.fps),
    finish: async () => {
      await output.finalize();
      return new Blob([output.target.buffer!], { type: "video/mp4" });
    },
  };
}

/** A hidden React root that renders the clip at 1:1, one frame at a time. */
function offscreenClip() {
  const host = document.createElement("div");
  host.style.cssText = "position:fixed;left:0;top:0;opacity:0;pointer-events:none;z-index:-1";
  document.body.appendChild(host);
  const root: Root = createRoot(host);
  return {
    render(frame: number) {
      flushSync(() => root.render(<RequestCardClip frame={frame} />));
      return host.firstElementChild as HTMLElement;
    },
  };
}

type Stats = { route: string; frames: number; seconds: number; msPerFrame: number; bytes: number };

async function runRouteA(onProgress: (p: number) => void): Promise<{ stats: Stats; blob: Blob }> {
  await loadFonts();
  const t0 = performance.now();
  const clip = offscreenClip();
  const draw = await domRasterizer(CLIP.width, CLIP.height);
  const enc = await encoder();
  for (let i = 0; i < CLIP_FRAMES; i++) {
    await draw(clip.render(i), enc.ctx);
    await enc.add(i);
    onProgress((i + 1) / CLIP_FRAMES);
  }
  const blob = await enc.finish();
  const ms = performance.now() - t0;
  return { blob, stats: { route: "a", frames: CLIP_FRAMES, seconds: +(ms / 1000).toFixed(2), msPerFrame: +(ms / CLIP_FRAMES).toFixed(1), bytes: blob.size } };
}

declare global {
  interface Window {
    __siteblock?: unknown;
    __mp4?: Blob;
  }
}

// Route (b) hooks for the capture script: it sets frames, screenshots, and posts PNGs back to encode.
let pngEnc: Awaited<ReturnType<typeof encoder>> | null = null;
let setFrameHook: ((f: number) => void) | null = null;
window.__siteblock = {
  frames: CLIP_FRAMES,
  size: [CLIP.width, CLIP.height],
  ready: loadFonts(),
  setFrame: (f: number) =>
    new Promise<void>((resolve) => {
      flushSync(() => setFrameHook?.(f));
      requestAnimationFrame(() => resolve());
    }),
  startPngEncode: async () => {
    pngEnc = await encoder();
  },
  addPng: async (i: number, b64: string) => {
    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    const bmp = await createImageBitmap(new Blob([bytes], { type: "image/png" }));
    pngEnc!.ctx.drawImage(bmp, 0, 0);
    bmp.close();
    await pngEnc!.add(i);
  },
  finishPngEncode: async () => {
    const blob = await pngEnc!.finish();
    window.__mp4 = blob;
    return blob.size;
  },
  mp4Base64: async () => {
    const buf = new Uint8Array(await window.__mp4!.arrayBuffer());
    let s = "";
    for (let i = 0; i < buf.length; i += 0x8000) s += String.fromCharCode(...buf.subarray(i, i + 0x8000));
    return btoa(s);
  },
};

function Bare() {
  const [frame, setFrame] = useState(Number(q.get("frame") ?? 0));
  useEffect(() => {
    setFrameHook = setFrame;
  }, []);
  return <RequestCardClip frame={frame} />;
}

function Compare({ frame }: { frame: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [done, setDone] = useState(false);
  useEffect(() => {
    (async () => {
      await loadFonts();
      const clip = offscreenClip();
      const draw = await domRasterizer(CLIP.width, CLIP.height);
      const ctx = ref.current!.getContext("2d")!;
      await draw(clip.render(frame), ctx);
      setDone(true);
      document.title = "Compare ready";
    })().catch((e) => (document.title = `Compare failed: ${e}`));
  }, [frame]);
  return (
    <div style={{ display: "flex", gap: 20, padding: 20, background: "#888", alignItems: "flex-start" }}>
      <div style={{ zoom: 0.5 }}>
        <RequestCardClip frame={frame} />
      </div>
      <canvas ref={ref} width={CLIP.width} height={CLIP.height} style={{ width: CLIP.width / 2, height: CLIP.height / 2, opacity: done ? 1 : 0.2 }} />
    </div>
  );
}

function Page() {
  const [frame, setFrame] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<Stats | null>(null);
  const [video, setVideo] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    const start = performance.now() - (frame / CLIP.fps) * 1000;
    const tick = (now: number) => {
      setFrame(Math.floor(((now - start) / 1000) * CLIP.fps) % CLIP_FRAMES);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing]);

  const exportA = async () => {
    setError("");
    try {
      const { stats, blob } = await runRouteA(setProgress);
      window.__mp4 = blob;
      setResult(stats);
      setVideo(URL.createObjectURL(blob));
      document.title = `Export done ${JSON.stringify(stats)}`;
    } catch (e) {
      setError(String(e));
      document.title = `Export failed ${e}`;
    }
  };

  useEffect(() => {
    if (q.get("run") === "a") void exportA();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={{ display: "flex", gap: 32, padding: 32, fontFamily: "system-ui", fontSize: 14, background: "#f2f2f2", minHeight: "100vh" }}>
      <div>
        <div style={{ zoom: 0.45 }}>
          <RequestCardClip frame={frame} />
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 12, alignItems: "center" }}>
          <button onClick={() => setPlaying((p) => !p)}>{playing ? "Pause" : "Play"}</button>
          <input type="range" min={0} max={CLIP_FRAMES - 1} value={frame} onChange={(e) => setFrame(+e.target.value)} style={{ flex: 1 }} />
          <span>{(frame / CLIP.fps).toFixed(2)} s</span>
        </div>
      </div>
      <div style={{ maxWidth: 420 }}>
        <h3>Site block spike: Request card</h3>
        <p>Route (a) renders every frame in this tab (DOM → SVG → canvas) and encodes it here.</p>
        <button onClick={exportA}>Export MP4, route (a)</button>
        {progress > 0 && progress < 1 && <p>{Math.round(progress * 100)}%</p>}
        {error && <p style={{ color: "crimson" }}>{error}</p>}
        {result && <pre>{JSON.stringify(result, null, 1)}</pre>}
        {video && <video src={video} controls loop autoPlay muted style={{ width: 360 }} />}
        <p>Route (b): run the capture script against ?bare=1 (headless Chrome screenshots each frame).</p>
      </div>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>{q.get("bare") ? <Bare /> : q.get("compare") ? <Compare frame={Number(q.get("compare"))} /> : <Page />}</StrictMode>,
);
