import { defineCliConfig } from "sanity/cli";

export default defineCliConfig({
  api: { projectId: "g0dqg5p9", dataset: "production" },
  // served from sortedbyus.com/studio, so its files live under /studio/static
  project: { basePath: "/studio" },
  // The Studio is built into public/studio; don't copy the website's public/ folder into it.
  vite: (config) => ({ ...config, publicDir: false }),
});
