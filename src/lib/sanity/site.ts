import { cache } from "react";
import { defineQuery } from "groq";
import { sanityFetch } from "./client";
import { IMG } from "./image";
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

const siteQuery = defineQuery(`{
    "settings": *[_type == "siteSettings" && _id == "siteSettings"][0],
    "services": *[_type == "service" && defined(slug.current)] | order(order asc){title, "slug": slug.current, short, tileSummary, tileImage${IMG}, heroImage${IMG}}
  }`);

/** Settings + the service list, fetched once per build and shared by the header, footer and pages. */
export const getSite = cache(async () => {
  const d = await sanityFetch(siteQuery);
  const settings: Settings = { ...fallback, ...(d.settings ?? {}) } as Settings;
  return {
    settings,
    services: d.services,
    nav: d.services.map((s) => ({ label: s.title, href: `/services/${s.slug}` })),
    wa: (text?: string) => `https://wa.me/${settings.whatsappNumber}${text ? `?text=${encodeURIComponent(text)}` : ""}`,
  };
});
