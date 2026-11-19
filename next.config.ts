import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // React Compiler memoizes components and hooks automatically, so the code never needs useMemo/useCallback.
  reactCompiler: true,
  // cacheComponents / partialPrefetching are off: the site doesn't use them, and on Cloudflare Workers Cache
  // Components hang the render (Next can't rely on the Workers runtime's setTimeout).
  experimental: {
    // Styles arrive inside the HTML instead of as a separate render-blocking request (~12 KB gzipped), so
    // first-time visitors paint sooner. Client-side navigations still use cached <link>ed stylesheets.
    inlineCss: true,
  },
  // Keep the temporary workers.dev copy out of search results; sortedbyus.com is the canonical address.
  async headers() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "(?<host>.*\\.workers\\.dev)" }],
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
    ];
  },
  images: {
    // Every photo is pre-converted to WebP q90 at build (scripts/optimize-images.mjs); this loader points
    // next/image at those files instead of resizing on each request.
    loader: "custom",
    loaderFile: "./src/lib/image-loader.ts",
  },
};

export default nextConfig;

// Makes Cloudflare bindings available during `next dev`
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
initOpenNextCloudflareForDev();
