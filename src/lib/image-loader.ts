"use client";

import manifest from "./image-manifest.json";

type Entry = { hash: string; widths: number[] };
const files = manifest as Record<string, Entry>;

/**
 * Site-wide next/image loader. Sanity photos go to Sanity's image CDN (below); local photos: Maps a static import (e.g. /_next/static/media/market.1645bi6.jpg) to the
 * smallest pre-made WebP that covers the requested width (see scripts/optimize-images.mjs). Anything not
 * in the manifest is returned as-is.
 */
export default function imageLoader({ src, width }: { src: string; width: number }) {
  // Photos from Sanity: its image CDN resizes from the full-resolution original and serves the best format
  // the browser supports (AVIF/WebP). Same quality rule as the local files: q80 up to phone sizes, q90 above.
  if (src.startsWith("https://cdn.sanity.io/")) {
    const q = width <= 828 ? 80 : 90;
    return `${src}${src.includes("?") ? "&" : "?"}w=${width}&q=${q}&auto=format&fit=max`;
  }
  const name = src.split("/").pop()?.split(".")[0] ?? "";
  const entry = files[name];
  if (!entry) return src;
  const w = entry.widths.find((x) => x >= width) ?? entry.widths[entry.widths.length - 1];
  return `/img/${name}.${entry.hash}-${w}.webp`;
}
