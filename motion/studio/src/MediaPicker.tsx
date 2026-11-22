import { useEffect, useRef, useState } from "react";
import { Modal } from "./Modal";
import type { SanityClient } from "@sanity/client";
import { sanityImageValue, STARTER, starterValue } from "./media";
import { uploadAsset } from "./uploadAsset";

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
  const fileInput = useRef<HTMLInputElement>(null);
  const pendingUpload = useRef<AbortController | null>(null);
  useEffect(() => () => pendingUpload.current?.abort(), []);
  const match = (name?: string) => !search || (name ?? "").toLowerCase().includes(search.trim().toLowerCase());

  useEffect(() => {
    if (tab !== "library" || assets) return;
    client
      .fetch<Asset[]>(`*[_type == "sanity.imageAsset"] | order(_createdAt desc)[0...1000]{_id, url, originalFilename}`)
      .then(setAssets)
      .catch((e) => setError(String(e.message ?? e)));
  }, [tab, assets, client]);

  const upload = async (file: File) => {
    if (pendingUpload.current) return;
    const controller = new AbortController();
    pendingUpload.current = controller;
    setUploading(true);
    setError(null);
    try {
      const doc = await uploadAsset(client, "image", file, { filename: file.name }, controller.signal);
      controller.signal.throwIfAborted();
      onPick(sanityImageValue(doc.url));
    } catch (e) {
      if (!controller.signal.aborted) setError(String((e as Error).message ?? e));
    } finally {
      pendingUpload.current = null;
      if (!controller.signal.aborted) setUploading(false);
    }
  };

  const close = () => {
    pendingUpload.current?.abort();
    onClose();
  };
  const pick = (value: string) => {
    pendingUpload.current?.abort();
    onPick(value);
  };

  return (
    <Modal label="Choose a photo" onClose={close}>
      <header className="modal-head">
        <h2>Choose a photo</h2>
        <button className="btn ghost small" onClick={close}>
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
        <button className="btn ghost small upload" disabled={uploading} onClick={() => fileInput.current?.click()}>
          {uploading ? "Uploading…" : "Upload…"}
        </button>
        <input ref={fileInput} type="file" accept="image/*" hidden onChange={(event) => {
          const file = event.currentTarget.files?.[0];
          event.currentTarget.value = "";
          if (file) void upload(file);
        }} />
      </div>
      {error && <p className="error">{error}</p>}
      <div className="grid">
        {tab === "starter" && (
          <button className="tile" onClick={() => pick("")}>
            <span className="tile-none" aria-hidden>
              No photo
            </span>
            <span>Remove the photo</span>
          </button>
        )}
        {tab === "starter" &&
          STARTER.filter((s) => match(s.name)).map((s) => (
            <button key={s.name} className="tile" onClick={() => pick(starterValue(s.name))}>
              <img src={s.url} alt="" loading="lazy" />
              <span>{s.name}</span>
            </button>
          ))}
        {tab === "library" && !assets && !error && <p className="hint">Loading the library…</p>}
        {tab === "library" &&
          assets?.filter((a) => match(a.originalFilename)).map((a) => (
            <button key={a._id} className="tile" onClick={() => pick(sanityImageValue(a.url))}>
              <img src={`${a.url}?w=300&h=300&fit=crop&auto=format`} alt="" loading="lazy" />
              <span>{a.originalFilename ?? a._id}</span>
            </button>
          ))}
      </div>
    </Modal>
  );
}
