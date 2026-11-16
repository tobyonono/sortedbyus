import type { MetadataRoute } from "next";
import { site } from "@/lib/site";

/** /robots.txt: open to all crawlers, pointing at the sitemap. (The workers.dev copy is kept out of search
 *  results by an X-Robots-Tag header, see next.config.ts.) */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/v2"] }],
    sitemap: `${site.url}/sitemap.xml`,
    host: site.url,
  };
}
