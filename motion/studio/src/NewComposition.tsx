// "New composition": pick a template. Each card plays a small live preview of
// the template with its default content, so you can see what it does.
import { useEffect, useRef } from "react";
import { useEscape } from "./useEscape";
import { formatSize, type BaseData, type Template } from "../../engine";
import { imageFor, loadFonts, preloadImages } from "./media";
import { TEMPLATES } from "./templates";

export function NewComposition({ onPick, onClose }: { onPick: (templateId: string) => void; onClose: () => void }) {
  useEscape(onClose);
  return (
    <div className="modal-scrim" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal new-comp" role="dialog" aria-label="New composition">
        <header className="modal-head">
          <h2>New composition</h2>
          <button className="btn ghost small" onClick={onClose}>
            Close
          </button>
        </header>
        <div className="template-grid">
          {TEMPLATES.map((t) => (
            <button key={t.id} className="template-card" onClick={() => onPick(t.id)}>
              <MiniPreview template={t} />
              <span className="template-name">{t.name}</span>
              <span className="template-desc">{t.description}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/** The template's defaults, playing at thumbnail size in a 4:5 frame. */
function MiniPreview({ template }: { template: Template<BaseData> }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const data = { ...template.defaults, format: "portrait" as const };
    const [W, H] = formatSize(data.format);
    const scale = canvas.width / W;
    const ctx = canvas.getContext("2d")!;
    const total = template.frames(data);
    let raf = 0;
    let start = 0;
    Promise.all([loadFonts(), preloadImages(template.images(data))]).then(() => {
      start = performance.now();
      const tick = (now: number) => {
        const frame = Math.max(0, Math.floor(((now - start) / 1000) * data.fps)) % total;
        ctx.save();
        ctx.scale(scale, scale);
        template.draw(ctx, frame, data, { width: W, height: H, fps: data.fps, image: imageFor });
        ctx.restore();
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(raf);
  }, [template]);
  return <canvas ref={ref} className="template-preview" width={288} height={360} />;
}
