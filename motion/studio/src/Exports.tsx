// Exports saved to Sanity for the open composition: newest first, each with a
// download link. Files live in the Sanity media library as video files.
import { aspectLabel, brand, type FormatKey } from "../../engine";

export interface SavedExport {
  _key: string;
  format: FormatKey;
  fps: number;
  seconds: number;
  createdAt: string;
  url?: string;
  size?: number;
  filename?: string;
  /** Channels this video is approved for (brand.channels values). */
  approvedFor?: string[];
}

const CHANNEL_LABEL = Object.fromEntries(
  brand.channels.map((c) => [c.value, c.label]),
);

const when = (iso: string) =>
  new Date(iso).toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

export function Exports({
  items,
  onApprove,
}: {
  items: SavedExport[] | null | undefined;
  /** Save which channels an export is approved for. */
  onApprove?: (key: string, channels: string[]) => void;
}) {
  return (
    <section className="section exports">
      <div className="section-head static">
        <span>Exports</span>
        {items && <span className="field-value">{items.length}</span>}
      </div>
      <div className="section-body">
        {items === undefined ? (
          <p className="hint">Loading exports…</p>
        ) : items === null ? (
          <p className="hint">Couldn’t load exports.</p>
        ) : items.length ? (
          <ul className="export-list">
            {[...items].reverse().map((e) => (
              <li key={e._key}>
                <span className="export-meta">
                  <strong>
                    {aspectLabel(e.format)} · {e.seconds.toFixed(1)} s · {e.fps}{" "}
                    fps
                  </strong>
                  <small>
                    {when(e.createdAt)}
                    {e.size ? ` · ${(e.size / 1e6).toFixed(1)} MB` : ""}
                  </small>
                  {!!e.approvedFor?.length && (
                    <span className="export-approved">
                      {e.approvedFor.map((c) => (
                        <em key={c} className="badge approved">
                          {CHANNEL_LABEL[c] ?? c}
                        </em>
                      ))}
                    </span>
                  )}
                </span>
                <span className="export-actions">
                  {onApprove && (
                    <details className="comp-menu approve-menu">
                      <summary className="btn ghost small">Approve</summary>
                      <div role="group" aria-label="Approved for">
                        <p className="approve-head">Approved for</p>
                        {brand.channels.map((c) => {
                          const on = !!e.approvedFor?.includes(c.value);
                          return (
                            <label key={c.value} className="approve-option">
                              <input
                                type="checkbox"
                                checked={on}
                                onChange={() =>
                                  onApprove(
                                    e._key,
                                    on
                                      ? (e.approvedFor ?? []).filter(
                                          (x) => x !== c.value,
                                        )
                                      : [...(e.approvedFor ?? []), c.value],
                                  )
                                }
                              />
                              {c.label}
                            </label>
                          );
                        })}
                      </div>
                    </details>
                  )}
                  {e.url && (
                    <a
                      className="btn ghost small"
                      href={`${e.url}?dl=${encodeURIComponent(e.filename ?? "")}`}
                    >
                      Download
                    </a>
                  )}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="hint">
            Videos you export are kept here, saved in Sanity.
          </p>
        )}
      </div>
    </section>
  );
}
