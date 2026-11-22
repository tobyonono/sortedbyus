import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Modal } from "./Modal";
import { aspectLabel, brand, FORMAT_KEYS, formatSize, FPS_OPTIONS, type FormatKey, type PlayableSource } from "../../engine";
import { download, exportStill, exportVideo, MissingExportImages, prepareExportImages, type QualityKey } from "./exporter";

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "composition";
export type ExportMeta = { format: FormatKey; fps: number; seconds: number; filename: string };

export function ExportDialog({
  title,
  source,
  format,
  fps: startFps,
  frame,
  onSave,
  onClose,
}: {
  title: string;
  /** What to render: a composition or a reel. */
  source: PlayableSource;
  /** The format and frame rate it's currently shown in (preselected). */
  format: FormatKey;
  fps: number;
  frame: number;
  /** Keep a copy in Sanity (uploads the MP4 and lists it on the composition). */
  onSave?: (blob: Blob, meta: ExportMeta, signal: AbortSignal) => Promise<void>;
  onClose: () => void;
}) {
  const [formats, setFormats] = useState<Set<FormatKey>>(new Set([format]));
  const [fps, setFps] = useState(startFps);
  const [quality, setQuality] = useState<QualityKey>("high");
  const [repeat, setRepeat] = useState(1);
  const [still, setStill] = useState(false);
  const [keep, setKeep] = useState(true);
  const [status, setStatus] = useState<{ label: string; p: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [missing, setMissing] = useState<string[]>([]);
  const [allowMissingImages, setAllowMissingImages] = useState(false);
  const abort = useRef<AbortController | null>(null);
  const cancelButton = useRef<HTMLButtonElement>(null);
  const exportButton = useRef<HTMLButtonElement>(null);
  const notice = useRef<HTMLDivElement>(null);
  const wasBusy = useRef(false);
  const busy = status !== null;
  useEffect(() => () => abort.current?.abort(), []);
  useLayoutEffect(() => {
    if (busy) cancelButton.current?.focus();
    else if (wasBusy.current) (notice.current ?? exportButton.current)?.focus();
    wasBusy.current = busy;
  }, [busy]);
  const seconds = (source(format, fps).frames() / fps) * repeat;

  const toggle = (k: FormatKey) =>
    setFormats((s) => {
      const n = new Set(s);
      if (n.has(k)) n.delete(k);
      else n.add(k);
      return n;
    });

  const run = async () => {
    if (abort.current) return;
    setError(null);
    const controller = new AbortController();
    abort.current = controller;
    const { signal } = controller;
    const media = { signal, allowMissingImages };
    const list = FORMAT_KEYS.filter((k) => formats.has(k));
    setStatus({ label: "Checking photos", p: 0 });
    try {
      await prepareExportImages(list.flatMap((k) => source(k, fps).images()), media);
      setMissing([]);
      for (const [i, k] of list.entries()) {
        signal.throwIfAborted();
        const label = `${brand.formats[k].label} (${i + 1} of ${list.length})`;
        setStatus({ label, p: 0 });
        const blob = await exportVideo(source, {
          format: k,
          fps,
          quality,
          repeat,
          ...media,
          onProgress: (p) => setStatus({ label, p }),
        });
        signal.throwIfAborted();
        const filename = `${slug(title)}-${aspectLabel(k).replace(":", "x")}.mp4`;
        download(blob, filename);
        if (keep && onSave) {
          setStatus({ label: `Saving ${brand.formats[k].label} to Sanity`, p: 1 });
          await onSave(blob, { format: k, fps, seconds: (source(k, fps).frames() / fps) * repeat, filename }, signal);
        }
        signal.throwIfAborted();
        if (still) {
          const png = await exportStill(source, k, fps, frame, media);
          signal.throwIfAborted();
          download(png, `${slug(title)}-${aspectLabel(k).replace(":", "x")}-f${frame}.png`);
        }
      }
      onClose();
    } catch (e) {
      if (signal.aborted) return;
      if (e instanceof MissingExportImages) {
        setMissing(e.values);
        setAllowMissingImages(false);
      } else {
        setError(String((e as Error).message ?? e));
      }
    } finally {
      abort.current = null;
      setStatus(null);
    }
  };

  return (
    <Modal className="export" label={`Export ${title}`} onClose={onClose} dismissible={!busy}>
      <header className="modal-head">
        <h2>Export “{title}”</h2>
      </header>
      <div className="modal-body" inert={busy}>
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

        {(missing.length > 0 || error) && (
          <div className="missing-photos" ref={notice} tabIndex={-1}>
            {missing.length > 0 && (
              <>
                <p className="error" role="alert">
                  Couldn’t load {missing.length === 1 ? "this photo" : "these photos"}.
                </p>
                <ul>{missing.map((value) => <li key={value}>{value}</li>)}</ul>
                <label className="check">
                  <input type="checkbox" checked={allowMissingImages} onChange={(e) => setAllowMissingImages(e.target.checked)} />
                  Export with placeholders for missing photos
                </label>
              </>
            )}
            {error && <p className="error" role="alert">{error}</p>}
          </div>
        )}
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
            <button ref={cancelButton} className="btn ghost" onClick={() => abort.current?.abort()}>
              Cancel
            </button>
          </>
        ) : (
          <>
            <button className="btn ghost" onClick={onClose}>
              Cancel
            </button>
            <button ref={exportButton} className="btn primary" disabled={!formats.size} onClick={run}>
              {missing.length > 0 && !allowMissingImages ? "Retry export" : formats.size > 1 ? `Export ${formats.size} videos` : "Export"}
            </button>
          </>
        )}
      </footer>
    </Modal>
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
