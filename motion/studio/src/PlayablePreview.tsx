// A small live preview of any playable (template picker, reel screen strip,
// composition picker). Waits for fonts and photos, then loops; or shows one
// still frame when `still` is set.
import { useEffect, useRef } from "react";
import { formatSize, type Playable } from "../../engine";
import { framePreparer } from "./framePrep";
import { imageFor, loadFonts, preloadImages } from "./media";

export function PlayablePreview({
  playable, width, still, className, style, fluid,
}: {
  playable: Playable;
  width: number;
  still?: number;
  className?: string;
  /** Display size overrides, e.g. a fixed box with object-fit: cover to crop. */
  style?: React.CSSProperties;
  /** Let CSS size it (e.g. width: 100%); `width` is then only the drawing resolution. */
  fluid?: boolean;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [W, H] = formatSize(playable.format);
  const height = Math.round((width * H) / W);
  // Draw at the screen's pixel density so thumbnails stay sharp on retina displays.
  const dpr = typeof window === "undefined" ? 1 : Math.min(2, window.devicePixelRatio || 1);
  // Re-run when what's drawn changes, not on every render.
  const key = `${playable.format}|${playable.fps}|${playable.frames()}|${playable.images().join("|")}|${still ?? ""}|${width}`;
  const latest = useRef(playable);
  latest.current = playable;

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const scale = canvas.width / W;
    let raf = 0;
    let active = true;
    let last = 0;
    const paint = (frame: number) => {
      const p = latest.current;
      ctx.save();
      ctx.scale(scale, scale);
      p.draw(ctx, frame, { width: W, height: H, fps: p.fps, image: imageFor });
      ctx.restore();
      // Fade in once there's something to show, instead of a blank canvas that pops.
      canvas.style.opacity = "1";
    };
    const prep = framePreparer(() => active && paint(last));
    const draw = (frame: number) => {
      last = frame;
      prep(latest.current, frame, { width: W, height: H, fps: latest.current.fps, image: imageFor });
      paint(frame);
    };
    Promise.all([loadFonts(), preloadImages(latest.current.images())])
      .then(() => {
        if (!active) return;
        if (still !== undefined) return draw(still);
        const start = performance.now();
        const tick = (now: number) => {
          const p = latest.current;
          draw(Math.max(0, Math.floor(((now - start) / 1000) * p.fps)) % Math.max(1, p.frames()));
          raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
      })
      .catch(() => {});
    return () => {
      active = false;
      cancelAnimationFrame(raf);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return <canvas ref={ref} className={className} width={Math.round(width * dpr)} height={Math.round(height * dpr)} style={{ ...(fluid ? { aspectRatio: `${W} / ${H}` } : { width, height }), opacity: 0, transition: "opacity 150ms cubic-bezier(0.23, 1, 0.32, 1)", ...style }} />;
}
