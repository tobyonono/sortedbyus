/// <reference types="vite/client" />
// Photos and fonts for the stage. Image values in composition data are either
// a starter photo name ("boat", "boat.png", "starter/boat") or an https URL
// from the Sanity media library.
import herbikUrl from "./fonts/Herbik-Regular.woff2?url";
import turneryUrl from "./fonts/Turnery-Regular.woff2?url";
import turneryMediumUrl from "./fonts/Turnery-Medium.woff2?url";

const starterUrls = import.meta.glob("./starter/*.jpg", { eager: true, query: "?url", import: "default" }) as Record<string, string>;

export const STARTER = Object.entries(starterUrls)
  .map(([path, url]) => ({ name: path.split("/").pop()!.replace(/\.jpg$/, ""), url }))
  .sort((a, b) => a.name.localeCompare(b.name));

export function starterValue(name: string) {
  return `starter/${name}`;
}

export function resolveImage(value: string): string | null {
  if (!value) return null;
  if (/^https?:\/\//.test(value)) return value;
  const stem = value.replace(/^starter\//, "").replace(/\.[a-z0-9]+$/i, "");
  return STARTER.find((s) => s.name === stem)?.url ?? null;
}

/** Sanity CDN URL sized for video frames. */
export function sanityImageValue(url: string) {
  return `${url}?w=2160&fit=max&fm=jpg&q=85`;
}

// Photos are fetched, decoded and (if huge) scaled down once, before they're
// needed, and kept as ready-to-draw bitmaps. Drawing a photo that isn't decoded
// yet makes the browser decode it mid-playback, which stalls the player and
// makes the photo land after the word that goes with it.
const MAX_EDGE = 2160;

type Entry = { bitmap?: CanvasImageSource | null; promise: Promise<void> };
const cache = new Map<string, Entry>();
const listeners = new Set<() => void>();

export function onImageLoad(fn: () => void) {
  listeners.add(fn);
  return () => void listeners.delete(fn);
}

async function decode(url: string): Promise<CanvasImageSource | null> {
  const img = new Image();
  img.crossOrigin = "anonymous";
  img.decoding = "async";
  img.src = url;
  try {
    await img.decode();
  } catch {
    return null;
  }
  const scale = Math.min(1, MAX_EDGE / Math.max(img.naturalWidth, img.naturalHeight));
  try {
    return await createImageBitmap(img, {
      resizeWidth: Math.round(img.naturalWidth * scale),
      resizeHeight: Math.round(img.naturalHeight * scale),
      resizeQuality: "high",
    });
  } catch {
    return img; // older browsers: the decoded <img> still draws without a stall
  }
}

function load(value: string, retryFailed = false): Entry | null {
  const url = resolveImage(value);
  if (!url) return null;
  let e = cache.get(url);
  if (!e || (retryFailed && e.bitmap === null)) {
    const entry: Entry = { promise: Promise.resolve() };
    entry.promise = decode(url).then((bitmap) => {
      entry.bitmap = bitmap;
      listeners.forEach((l) => l());
    });
    cache.set(url, entry);
    e = entry;
  }
  return e;
}

export function imageFor(value: string): CanvasImageSource | null {
  return load(value)?.bitmap ?? null;
}

/** Wait for the requested photos and return the non-empty values that could not be decoded. */
export async function preloadImages(values: string[], retryFailed = false) {
  const results = await Promise.all([...new Set(values.filter(Boolean))].map(async (value) => {
    const entry = load(value, retryFailed);
    await entry?.promise;
    return entry?.bitmap ? null : value;
  }));
  return results.filter((value): value is string => value !== null);
}

let fontsReady: Promise<void> | null = null;
/** Loads every brand type style (motion/brand.json `type`) for canvas drawing. */
export function loadFonts() {
  fontsReady ??= (async () => {
    const faces = [
      new FontFace("Herbik", `url(${herbikUrl}) format("woff2")`, { weight: "400" }),
      new FontFace("Turnery", `url(${turneryUrl}) format("woff2")`, { weight: "400" }),
      new FontFace("Turnery", `url(${turneryMediumUrl}) format("woff2")`, { weight: "500" }),
    ];
    for (const face of await Promise.all(faces.map((f) => f.load()))) document.fonts.add(face);
  })();
  return fontsReady;
}
