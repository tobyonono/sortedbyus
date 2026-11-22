// The campaigns that link to the open composition or reel, each linking to the campaign in
// Sanity. Campaigns are made in the Studio's "Campaigns" list; they point at motion, not the
// other way round, so this asks Sanity which campaigns reference it.
import { useEffect, useState } from "react";
import type { SanityClient } from "@sanity/client";
import { baseId } from "./compositions";

type Campaign = { _id: string; title: string; status?: string };
const STATUS: Record<string, string> = { planning: "Planning", inProduction: "In production", live: "Live", done: "Done" };

export function Campaigns({ client, id, kind }: { client: SanityClient; id: string; kind: "composition" | "reel" }) {
  const [items, setItems] = useState<Campaign[] | null>(null);
  useEffect(() => {
    const base = baseId(id);
    let live = true;
    client
      .fetch<Campaign[]>(`*[_type == "campaign" && (references($id) || references($draft))] | order(startDate desc){_id, title, status}`, {
        id: base,
        draft: `drafts.${base}`,
      })
      .then((r) => live && setItems([...new Map((r ?? []).map((c) => [baseId(c._id), c])).values()]))
      .catch(() => live && setItems([]));
    return () => {
      live = false;
    };
  }, [client, id]);

  return (
    <section className="section">
      <div className="section-head static">
        <span>Campaigns</span>
        {!!items?.length && <span className="field-value">{items.length}</span>}
      </div>
      <div className="section-body">
        {items === null ? (
          <p className="hint">Loading…</p>
        ) : items.length ? (
          <ul className="campaign-list">
            {items.map((c) => (
              <li key={c._id}>
                <a href={`/studio/intent/edit/id=${baseId(c._id)};type=campaign/`} target="_top">
                  {c.title}
                </a>
                {c.status && <small>{STATUS[c.status] ?? c.status}</small>}
              </li>
            ))}
          </ul>
        ) : (
          <p className="hint">Not in a campaign yet. Add this {kind} to one from Campaigns in the Studio sidebar.</p>
        )}
      </div>
    </section>
  );
}
