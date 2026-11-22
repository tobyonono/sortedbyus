import { fileURLToPath } from "node:url";
import { defineCliConfig } from "sanity/cli";

// Site blocks in the motion studio render the website's own components, which import with "@/"
// and use next/link (stubbed: the Studio has no Next router).
const siteAliases = [
  { find: /^@\//, replacement: fileURLToPath(new URL("./src/", import.meta.url)) },
  { find: /^next\/link$/, replacement: fileURLToPath(new URL("./motion/templates/site/nextLink.tsx", import.meta.url)) },
];

export default defineCliConfig({
  api: { projectId: "g0dqg5p9", dataset: "production" },
  // served from sortedbyus.com/studio, so its files live under /studio/static
  project: { basePath: "/studio" },
  // The Studio is built into public/studio; don't copy the website's public/ folder into it.
  vite: (config) => {
    const existing = config.resolve?.alias;
    const alias = Array.isArray(existing)
      ? existing
      : Object.entries(existing ?? {}).map(([find, replacement]) => ({ find, replacement: replacement as string }));
    return { ...config, publicDir: false, resolve: { ...config.resolve, alias: [...siteAliases, ...alias] } };
  },
  // `npm run typegen`: result types for every defineQuery in src, from the extracted Studio schema.
  typegen: {
    path: "./src/**/*.{ts,tsx}",
    schema: "./src/lib/sanity/schema.json",
    generates: "./src/lib/sanity/types.ts",
  },
});
