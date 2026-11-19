import type { StaticImageData } from "next/image";
import { createImageUrlBuilder } from "@sanity/image-url";
import { projectId, dataset } from "./env";

const builder = createImageUrlBuilder({ projectId, dataset });

/** An image field as returned by the IMG fragment below (Sanity returns null for anything not set). */
export type SanityImg = {
  alt?: string | null;
  asset?: { _id: string; url: string; metadata?: { lqip?: string | null } | null } | null;
  hotspot?: { x?: number; y?: number; width?: number; height?: number } | null;
  crop?: { top?: number; bottom?: number; left?: number; right?: number } | null;
} | null;

/** What components render: a Sanity photo or a local one, with optional focal point. */
export type Pic = { src: string | StaticImageData; alt: string; blur?: string; focus?: string };

/** GROQ projection for an image field. */
export const IMG = `{alt, hotspot, crop, asset->{_id, url, metadata{lqip}}}`;

/**
 * Sanity image field -> Pic. The URL keeps any crop the editor set; the site's image loader adds the width,
 * quality and best format per request. The focal point (hotspot) becomes the photo's object-position.
 */
export function pic(img: SanityImg | undefined, fallbackAlt = ""): Pic | null {
  if (!img?.asset?.url) return null;
  const { crop, hotspot } = img;
  const cropped = crop && (crop.top || crop.bottom || crop.left || crop.right);
  const spot = hotspot?.x != null && hotspot.y != null ? { x: hotspot.x, y: hotspot.y, width: hotspot.width ?? 1, height: hotspot.height ?? 1 } : undefined;
  const src = cropped
    ? builder.image({ asset: { _ref: img.asset._id }, crop: { top: crop.top ?? 0, bottom: crop.bottom ?? 0, left: crop.left ?? 0, right: crop.right ?? 0 }, hotspot: spot }).url()
    : img.asset.url;
  return {
    src,
    alt: img.alt || fallbackAlt,
    blur: img.asset.metadata?.lqip ?? undefined,
    focus: spot ? `${Math.round(spot.x * 100)}% ${Math.round(spot.y * 100)}%` : undefined,
  };
}

/** Same, for places that always have a photo (the schema requires one). */
export const must = (img: SanityImg | undefined, fallbackAlt = ""): Pic =>
  pic(img, fallbackAlt) ?? { src: "/og.jpg", alt: fallbackAlt };
