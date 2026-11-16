import type { StaticImageData } from "next/image";
import { createImageUrlBuilder } from "@sanity/image-url";
import { projectId, dataset } from "./env";

const builder = createImageUrlBuilder({ projectId, dataset });

/** An image field as returned by the IMG fragment below. */
export type SanityImg = {
  alt?: string;
  asset?: { _id: string; url: string; metadata?: { lqip?: string } };
  hotspot?: { x: number; y: number };
  crop?: { top: number; bottom: number; left: number; right: number };
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
  const cropped = img.crop && (img.crop.top || img.crop.bottom || img.crop.left || img.crop.right);
  const src = cropped ? builder.image({ ...img, asset: { _ref: img.asset._id } }).url() : img.asset.url;
  return {
    src,
    alt: img.alt || fallbackAlt,
    blur: img.asset.metadata?.lqip,
    focus: img.hotspot ? `${Math.round(img.hotspot.x * 100)}% ${Math.round(img.hotspot.y * 100)}%` : undefined,
  };
}

/** Same, for places that always have a photo (the schema requires one). */
export const must = (img: SanityImg | undefined, fallbackAlt = ""): Pic =>
  pic(img, fallbackAlt) ?? { src: "/og.jpg", alt: fallbackAlt };
