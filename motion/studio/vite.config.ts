// Dev-only harness server: `npm run motion:harness` -> localhost:3333/harness.html.
// Renders the motion studio and the Studio home page with local data and no
// Sanity login. The real thing lives in the Studio at /studio/motion.
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

export default defineConfig(({ mode }) => ({
  server: {
    port: 3333,
    strictPort: true,
    // engine/, templates/, brand.json and the Studio home cards live outside this folder
    fs: { allow: ["../.."] },
  },
  // site blocks (templates that use the website's components) import with "@/" and use next/link
  resolve: {
    alias: {
      "@/": fileURLToPath(new URL("../../src/", import.meta.url)),
      "next/link": fileURLToPath(new URL("../templates/site/nextLink.tsx", import.meta.url)),
    },
  },
  define: {
    "process.env.NODE_ENV": JSON.stringify(mode === "production" ? "production" : "development"),
  },
  oxc: { jsx: { runtime: "automatic" } },
}));
