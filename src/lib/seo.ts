import type { Metadata } from "next";
import { site } from "./site";

/**
 * Per-page metadata with a canonical link and matching social preview text. Pages that set `openGraph`
 * replace the layout's, so the shared fields (site name, locale, preview image) are repeated here.
 */
export function pageMeta({ title, description, path }: { title?: string; description: string; path: string }): Metadata {
  const ogTitle = title ? `${title} · ${site.name}` : `${site.name} — Personal concierge in Nigeria`;
  return {
    ...(title ? { title } : {}),
    description,
    alternates: { canonical: path },
    openGraph: {
      type: "website",
      siteName: site.name,
      locale: "en_NG",
      url: path,
      title: ogTitle,
      description,
      images: [{ url: "/og.jpg", width: 1200, height: 630, alt: `${site.name}: ${site.tagline}` }],
    },
    twitter: { card: "summary_large_image", title: ogTitle, description, images: ["/og.jpg"] },
  };
}
