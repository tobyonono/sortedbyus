import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

/**
 * What the site's pages may load. Everything is first-party except Sanity's image CDN.
 * 'unsafe-inline' scripts: Next writes its page data as inline scripts and the pages are pre-built, so per-request
 * nonces aren't possible. 'unsafe-inline' styles: the CSS is inlined into the HTML (inlineCss) and React sets
 * style attributes. 'unsafe-eval' only in dev (fast refresh).
 */
const CSP = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://cdn.sanity.io",
  "font-src 'self'",
  `connect-src 'self'${isDev ? " ws:" : ""}`,
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'self'",
].join("; ");

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
  // Short address for the motion studio (a Studio tool).
  async redirects() {
    return [{ source: "/motion", destination: "/studio/motion", permanent: false }];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          // Two years of HTTPS-only. No includeSubDomains/preload: that would lock every subdomain too.
          { key: "Strict-Transport-Security", value: "max-age=63072000" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
      {
        // Report-only for now: browsers log what would be blocked (DevTools console) without blocking it.
        // Switch the key to Content-Security-Policy once it has stayed quiet. The Studio (/studio) is left out:
        // it talks to many Sanity hosts and is an admin page.
        source: "/:path((?!studio(?:/|$)).*)",
        headers: [{ key: "Content-Security-Policy-Report-Only", value: CSP }],
      },
      // Keep the temporary workers.dev copy out of search results; sortedbyus.com is the canonical address.
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
