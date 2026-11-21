import { useEffect, useReducer, useRef, useState, type MutableRefObject } from "react";
import { aspectLabel, formatSize, type BaseData, type Template } from "../../engine";
import { imageFor, loadFonts, onImageLoad, preloadImages } from "./media";

function clock(frames: number, fps: number) {
  const s = frames / fps;
  const m = Math.floor(s / 60);
  return `${m}:${(s - m * 60).toFixed(2).padStart(5, "0")}`;
}

export function Stage({
  template,
  data,
  frameRef,
  initialFrame = 0,
  autoplay = true,
}: {
  template: Template<BaseData>;
  data: BaseData;
  frameRef: MutableRefObject<number>;
  initialFrame?: number;
  autoplay?: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [frame, setFrame] = useState(initialFrame);
  const [playing, setPlaying] = useState(autoplay);
  const [, redraw] = useReducer((x: number) => x + 1, 0);
  const total = template.frames(data);
  const [W, H] = formatSize(data.format);
  const f = Math.min(frame, total - 1);
  frameRef.current = f;

  useEffect(() => {
    loadFonts().then(redraw);
    return onImageLoad(redraw);
  }, []);

  // Don't play until the font and every photo are decoded, so the first pass
  // is in sync. Photos added later load in the background.
  const imageKey = template.images(data).join("|");
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let live = true;
    Promise.all([loadFonts(), preloadImages(imageKey ? imageKey.split("|") : [])]).then(() => live && setReady(true));
    return () => {
      live = false;
    };
  }, [imageKey]);

  useEffect(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (ctx) template.draw(ctx, f, data, { width: W, height: H, fps: data.fps, image: imageFor });
  });

  useEffect(() => {
    if (!playing || !ready) return;
    const start = performance.now() - (frameRef.current / data.fps) * 1000;
    let raf = 0;
    const tick = (now: number) => {
      // rAF timestamps can be slightly earlier than `start`; never go below frame 0
      setFrame(Math.max(0, Math.floor(((now - start) / 1000) * data.fps)) % total);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, ready, data.fps, total, frameRef]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target instanceof Element ? e.target : null;
      if (e.code !== "Space" || el?.closest("input, textarea, select, button, a, summary, [contenteditable]")) return;
      if (document.querySelector(".studio .modal-scrim")) return;
      e.preventDefault();
      setPlaying((p) => !p);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const segments = template.segments(data);
  const barRef = useRef<HTMLDivElement>(null);
  const scrubTo = (clientX: number) => {
    const r = barRef.current!.getBoundingClientRect();
    const p = Math.min(1, Math.max(0, (clientX - r.left) / r.width));
    setPlaying(false);
    setFrame(Math.min(total - 1, Math.floor(p * total)));
  };
  const jump = (dir: 1 | -1) => {
    setPlaying(false);
    const starts = segments.map((s) => s.start);
    const next = dir > 0 ? starts.find((s) => s > f) ?? 0 : [...starts].reverse().find((s) => s < f) ?? starts[starts.length - 1];
    setFrame(next);
  };

  return (
    <section className="stage">
      <div className="stage-canvas">
        <canvas ref={canvasRef} width={W} height={H} />
        {!ready && <span className="stage-loading">Loading photos…</span>}
      </div>
      <div className="timeline">
        <div className="transport">
          <button className="icon-btn" onClick={() => jump(-1)} aria-label="Previous screen">
            <svg viewBox="0 0 16 16"><path d="M4 3v10M13 3 6 8l7 5z" /></svg>
          </button>
          <button className="play-btn" onClick={() => setPlaying((p) => !p)} aria-label={playing ? "Pause" : "Play"}>
            {playing ? (
              <svg viewBox="0 0 16 16"><path d="M5 3h2v10H5zM9 3h2v10H9z" /></svg>
            ) : (
              <svg viewBox="0 0 16 16"><path d="M5 3l8 5-8 5z" /></svg>
            )}
          </button>
          <button className="icon-btn" onClick={() => jump(1)} aria-label="Next screen">
            <svg viewBox="0 0 16 16"><path d="M12 3v10M3 3l7 5-7 5z" /></svg>
          </button>
        </div>
        <span className="timecode">
          {clock(f, data.fps)} / {clock(total, data.fps)}
        </span>
        <div
          className="track"
          ref={barRef}
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            scrubTo(e.clientX);
          }}
          onPointerMove={(e) => e.buttons && scrubTo(e.clientX)}
        >
          {segments.map((s, i) => (
            <div
              key={i}
              className={`segment${f >= s.start && f < s.end ? " is-active" : ""}`}
              style={{ left: `${(s.start / total) * 100}%`, width: `${((s.end - s.start) / total) * 100}%` }}
              title={s.label}
            >
              <span>
                {i + 1} · {s.label}
              </span>
            </div>
          ))}
          <div className="playhead" style={{ left: `${(f / total) * 100}%` }} />
        </div>
        <span className="stage-meta">
          {aspectLabel(data.format)} · {W}×{H} · {data.fps} fps · loops
        </span>
      </div>
    </section>
  );
}
