import type { MetadataRoute } from "next";
import { site } from "@/lib/site";
import { getServiceSlugs } from "@/sanity/queries";

/** /sitemap.xml: every public page on the canonical domain. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const slugs = await getServiceSlugs();
  const page = (path: string, priority: number): MetadataRoute.Sitemap[number] => ({
    url: `${site.url}${path}`,
    changeFrequency: "monthly",
    priority,
  });
  return [
    page("/", 1),
    ...slugs.map((slug) => page(`/services/${slug}`, 0.9)),
    page("/how-it-works", 0.8),
    page("/corporate", 0.8),
    page("/about", 0.7),
    page("/contact", 0.7),
    page("/privacy", 0.3),
    page("/terms", 0.3),
  ];
}
