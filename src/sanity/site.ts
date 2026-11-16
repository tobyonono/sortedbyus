import { cache } from "react";
import { sanityFetch } from "./client";
import { IMG, type SanityImg } from "./image";
import { site as fallback } from "@/lib/site";

export type Settings = {
  whatsappNumber: string;
  whatsappDisplay: string;
  email: string;
  instagram?: string;
  linkedin?: string;
  hours?: string;
  description: string;
};
export type ServiceLink = { title: string; slug: string; short: string; tileSummary: string; tileImage: SanityImg; heroImage: SanityImg };

/** Settings + the service list, fetched once per build and shared by the header, footer and pages. */
export const getSite = cache(async () => {
  const d = await sanityFetch<{ settings: Settings | null; services: ServiceLink[] }>(`{
    "settings": *[_id == "siteSettings"][0],
    "services": *[_type == "service" && defined(slug.current)] | order(order asc){title, "slug": slug.current, short, tileSummary, tileImage${IMG}, heroImage${IMG}}
  }`);
  const settings: Settings = { ...fallback, ...(d.settings ?? {}) } as Settings;
  return {
    settings,
    services: d.services,
    nav: d.services.map((s) => ({ label: s.title, href: `/services/${s.slug}` })),
    wa: (text?: string) => `https://wa.me/${settings.whatsappNumber}${text ? `?text=${encodeURIComponent(text)}` : ""}`,
  };
});
