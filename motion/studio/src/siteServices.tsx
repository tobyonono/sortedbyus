// The website's services, as the request form lists them: Sanity "service" titles in the site's
// order, then "Corporate" and "Something else" (src/app/page.tsx builds the same list).
// Loaded once by the studio and shared with every "service" control through context.
import { createContext, useContext, useEffect, useState } from "react";
import type { SanityClient } from "@sanity/client";
import { serviceIds } from "./links";

const EXTRAS = ["Corporate", "Something else"];

export const SiteServices = createContext<string[] | null>(null);
export const useSiteServicesList = () => useContext(SiteServices);

export function useLoadSiteServices(client: SanityClient) {
  const [services, setServices] = useState<string[] | null>(null);
  useEffect(() => {
    let live = true;
    client
      .fetch<{ _id: string; title: string }[]>(`*[_type == "service" && defined(slug.current)] | order(order asc){_id, title}`)
      .then((rows) => {
        const list = (rows ?? []).filter((r) => r?.title);
        for (const r of list) serviceIds.set(r.title, r._id.replace(/^drafts\./, ""));
        if (live) setServices([...list.map((r) => r.title), ...EXTRAS]);
      })
      .catch(() => live && setServices(EXTRAS));
    return () => {
      live = false;
    };
  }, [client]);
  return services;
}
