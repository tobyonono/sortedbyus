import { useEffect, useState } from "react";
import { useEscape } from "./useEscape";
import type { SanityClient } from "@sanity/client";
import { sanityImageValue, STARTER, starterValue } from "./media";

type Asset = { _id: string; url: string; originalFilename?: string };

export function MediaPicker({
  client,
  onPick,
  onClose,
  initialTab = "starter",
}: {
  client: SanityClient;
  onPick: (value: string) => void;
  onClose: () => void;
  initialTab?: "starter" | "library";
}) {
  const [tab, setTab] = useState<"starter" | "library">(initialTab);
  const [assets, setAssets] = useState<Asset[] | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  useEscape(onClose);
  const match = (name?: string) => !search || (name ?? "").toLowerCase().includes(search.trim().toLowerCase());

  useEffect(() => {
    if (tab !== "library" || assets) return;
    client
      .fetch<Asset[]>(`*[_type == "sanity.imageAsset"] | order(_createdAt desc)[0...1000]{_id, url, originalFilename}`)
      .then(setAssets)
      .catch((e) => setError(String(e.message ?? e)));
  }, [tab, assets, client]);

  const upload = async (file: File) => {
    setUploading(true);
    setError(null);
    try {
      const doc = await client.assets.upload("image", file, { filename: file.name });
      onPick(sanityImageValue(doc.url));
    } catch (e) {
      setError(String((e as Error).message ?? e));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="modal-scrim" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-label="Choose a photo">
        <header className="modal-head">
          <h2>Choose a photo</h2>
          <button className="btn ghost small" onClick={onClose}>
            Close
          </button>
        </header>
        <div className="tabs">
          <button className={tab === "starter" ? "is-on" : ""} onClick={() => setTab("starter")}>
            Film photos
          </button>
          <button className={tab === "library" ? "is-on" : ""} onClick={() => setTab("library")}>
            Sanity library
          </button>
          <input
            className="input picker-search"
            type="search"
            placeholder="Search by name"
            aria-label="Search photos by name"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <label className="btn ghost small upload">
            {uploading ? "Uploading…" : "Upload…"}
            <input type="file" accept="image/*" hidden disabled={uploading} onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
          </label>
        </div>
        {error && <p className="error">{error}</p>}
        <div className="grid">
          {tab === "starter" && (
            <button className="tile" onClick={() => onPick("")}>
              <span className="tile-none" aria-hidden>
                No photo
              </span>
              <span>Remove the photo</span>
            </button>
          )}
          {tab === "starter" &&
            STARTER.filter((s) => match(s.name)).map((s) => (
              <button key={s.name} className="tile" onClick={() => onPick(starterValue(s.name))}>
                <img src={s.url} alt="" loading="lazy" />
                <span>{s.name}</span>
              </button>
            ))}
          {tab === "library" && !assets && !error && <p className="hint">Loading the library…</p>}
          {tab === "library" &&
            assets?.filter((a) => match(a.originalFilename)).map((a) => (
              <button key={a._id} className="tile" onClick={() => onPick(sanityImageValue(a.url))}>
                <img src={`${a.url}?w=300&h=300&fit=crop&auto=format`} alt="" loading="lazy" />
                <span>{a.originalFilename ?? a._id}</span>
              </button>
            ))}
        </div>
      </div>
    </div>
  );
}
