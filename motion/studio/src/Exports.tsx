// Exports saved to Sanity for the open composition: newest first, each with a
// download link. Files live in the Sanity media library as video files.
import { aspectLabel, type FormatKey } from "../../engine";

export interface SavedExport {
  _key: string;
  format: FormatKey;
  fps: number;
  seconds: number;
  createdAt: string;
  url?: string;
  size?: number;
  filename?: string;
}

const when = (iso: string) =>
  new Date(iso).toLocaleString(undefined, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

export function Exports({ items }: { items: SavedExport[] }) {
  return (
    <section className="section exports">
      <div className="section-head static">
        <span>Exports</span>
        <span className="field-value">{items.length}</span>
      </div>
      <div className="section-body">
        {items.length ? (
          <ul className="export-list">
            {[...items].reverse().map((e) => (
              <li key={e._key}>
                <span className="export-meta">
                  <strong>
                    {aspectLabel(e.format)} · {e.seconds.toFixed(1)} s · {e.fps} fps
                  </strong>
                  <small>
                    {when(e.createdAt)}
                    {e.size ? ` · ${(e.size / 1e6).toFixed(1)} MB` : ""}
                  </small>
                </span>
                {e.url && (
                  <a className="btn ghost small" href={`${e.url}?dl=${encodeURIComponent(e.filename ?? "")}`}>
                    Download
                  </a>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="hint">Videos you export are kept here, saved in Sanity.</p>
        )}
      </div>
    </section>
  );
}
