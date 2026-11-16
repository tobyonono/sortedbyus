import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import staticAssetsIncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/static-assets-incremental-cache";

// The site is static (no revalidation), so prerendered pages are served straight from the build's static
// assets instead of being re-rendered by React on every request. Without this, the heavier pages
// (homepage, Corporate, service pages) intermittently ran past the Worker's CPU limit and returned 500.
// Cache interception answers those cache hits before the Next server even starts.
export default defineCloudflareConfig({
  incrementalCache: staticAssetsIncrementalCache,
  enableCacheInterception: true,
});
