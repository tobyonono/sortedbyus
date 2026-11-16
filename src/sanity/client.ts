import { createClient } from "@sanity/client";
import { projectId, dataset, apiVersion } from "./env";

/** Read client. Pages are built ahead of time, so read straight from the API (no CDN lag) at build. */
export const client = createClient({ projectId, dataset, apiVersion, useCdn: false, perspective: "published" });

export const sanityFetch = <T>(query: string, params: Record<string, unknown> = {}) => client.fetch<T>(query, params);
