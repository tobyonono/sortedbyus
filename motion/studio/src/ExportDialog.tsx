import { useRef, useState } from "react";
import { useEscape } from "./useEscape";
import { aspectLabel, brand, FORMAT_KEYS, formatSize, FPS_OPTIONS, type BaseData, type FormatKey, type Template } from "../../engine";
import { download, exportStill, exportVideo, type QualityKey } from "./exporter";

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "composition";

export function ExportDialog({
  title,
  template,
  data,
  frame,
  onSave,
  onClose,
}: {
  title: string;
  template: Template<BaseData>;
  data: BaseData;
  frame: number;
  /** Keep a copy in Sanity (uploads the MP4 and lists it on the composition). */
  onSave?: (blob: Blob, meta: { format: FormatKey; fps: number; seconds: number; filename: string }) => Promise<void>;
  onClose: () => void;
}) {
  const [formats, setFormats] = useState<Set<FormatKey>>(new Set([data.format]));
  const [fps, setFps] = useState(data.fps);
  const [quality, setQuality] = useState<QualityKey>("high");
  const [repeat, setRepeat] = useState(1);
  const [still, setStill] = useState(false);
  const [keep, setKeep] = useState(true);
  const [status, setStatus] = useState<{ label: string; p: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const abort = useRef<AbortController | null>(null);
  useEscape(onClose, !status);
  const seconds = (template.frames({ ...data, fps }) / fps) * repeat;

  const toggle = (k: FormatKey) =>
    setFormats((s) => {
      const n = new Set(s);
      if (n.has(k)) n.delete(k);
      else n.add(k);
      return n;
    });

  const run = async () => {
    setError(null);
    abort.current = new AbortController();
    const list = FORMAT_KEYS.filter((k) => formats.has(k));
    try {
      for (const [i, k] of list.entries()) {
        const label = `${brand.formats[k].label} (${i + 1} of ${list.length})`;
        setStatus({ label, p: 0 });
        const blob = await exportVideo(template, data, {
          format: k,
          fps,
          quality,
          repeat,
          signal: abort.current.signal,
          onProgress: (p) => setStatus({ label, p }),
        });
        const filename = `${slug(title)}-${aspectLabel(k).replace(":", "x")}.mp4`;
        download(blob, filename);
        if (keep && onSave) {
          setStatus({ label: `Saving ${brand.formats[k].label} to Sanity`, p: 1 });
          await onSave(blob, { format: k, fps, seconds: template.frames({ ...data, fps }) / fps * repeat, filename });
        }
        if (still) download(await exportStill(template, data, k, frame), `${slug(title)}-${aspectLabel(k).replace(":", "x")}-f${frame}.png`);
      }
      setStatus(null);
      onClose();
    } catch (e) {
      setStatus(null);
      if ((e as Error).name !== "AbortError") setError(String((e as Error).message ?? e));
    }
  };

  return (
    <div className="modal-scrim" onMouseDown={(e) => e.target === e.currentTarget && !status && onClose()}>
      <div className="modal export" role="dialog" aria-label={`Export ${title}`}>
        <header className="modal-head">
          <h2>Export “{title}”</h2>
          <button className="btn ghost small" onClick={onClose} disabled={!!status}>
            Close
          </button>
        </header>
        <div className="modal-body">
          <div className="formats">
            {FORMAT_KEYS.map((k) => {
              const [w, h] = formatSize(k);
              return (
                <label key={k} className={`format-row${formats.has(k) ? " is-on" : ""}`}>
                  <input type="checkbox" checked={formats.has(k)} onChange={() => toggle(k)} />
                  <span>
                    <strong>{brand.formats[k].label}</strong>
                    <small>
                      Video {w}×{h}
                    </small>
                  </span>
                </label>
              );
            })}
          </div>

          <h3>Video · looping MP4</h3>
          <p className="hint">
            {seconds.toFixed(1)}s · H.264 where supported · silent
          </p>
          <div className="option-grid">
            <Seg label="Frame rate" options={FPS_OPTIONS.map((f) => [f, String(f)] as const)} value={fps} onChange={setFps} />
            <Seg
              label="Quality"
              options={[
                ["standard", "Standard"],
                ["high", "High"],
                ["max", "Max"],
              ]}
              value={quality}
              onChange={setQuality}
            />
            <Seg label="Repeat loop" options={[1, 2, 3, 4].map((n) => [n, `${n}×`] as const)} value={repeat} onChange={setRepeat} />
          </div>

          {onSave && (
            <label className="check keep">
              <input type="checkbox" checked={keep} onChange={(e) => setKeep(e.target.checked)} />
              Keep a copy in Sanity, listed under this composition
            </label>
          )}

          <h3>Still</h3>
          <label className="check">
            <input type="checkbox" checked={still} onChange={(e) => setStill(e.target.checked)} />
            Also save the current frame ({frame}) as PNG
          </label>

          {error && <p className="error">{error}</p>}
        </div>
        <footer className="modal-foot">
          {status ? (
            <>
              <div className="progress">
                <span>
                  {status.label} · {Math.round(status.p * 100)}%
                </span>
                <i style={{ width: `${status.p * 100}%` }} />
              </div>
              <button className="btn ghost" onClick={() => abort.current?.abort()}>
                Cancel
              </button>
            </>
          ) : (
            <>
              <button className="btn ghost" onClick={onClose}>
                Cancel
              </button>
              <button className="btn primary" disabled={!formats.size} onClick={run}>
                Export {formats.size > 1 ? `${formats.size} videos` : ""}
              </button>
            </>
          )}
        </footer>
      </div>
    </div>
  );
}

function Seg<T extends string | number>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: readonly (readonly [T, string])[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="field">
      <span className="field-label">{label}</span>
      <div className="seg">
        {options.map(([v, l]) => (
          <button key={String(v)} className={v === value ? "is-on" : ""} onClick={() => onChange(v)}>
            {l}
          </button>
        ))}
      </div>
    </div>
  );
}
