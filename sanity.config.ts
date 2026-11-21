import { defineConfig } from "sanity";
import { structureTool } from "sanity/structure";
import { projectId, dataset, apiVersion } from "./src/lib/sanity/env";
import { schemaTypes, singletons } from "./src/lib/sanity/schemaTypes";
import { structure } from "./src/lib/sanity/structure";
import { homeTool } from "./src/lib/sanity/tools/home";
import { StudioIcon } from "./src/lib/sanity/StudioIcon";
import { motionTool } from "./motion/studio/src/tool";

/** Studio at /studio: built to static files in public/studio by `npm run build:studio`; the /studio base path is set in sanity.cli.ts. */
export default defineConfig({
  name: "sorted-by-us",
  title: "Sorted by Us",
  icon: StudioIcon,
  projectId,
  dataset,
  schema: {
    types: schemaTypes,
    // singletons can't be created from the "+" menu
    // motion compositions are made in the Motion tool (/studio/motion), not from the "+" menu
    templates: (templates) => templates.filter(({ schemaType }) => !singletons.includes(schemaType) && schemaType !== "request" && schemaType !== "motionComposition"),
  },
  document: {
    // singletons: no duplicate/delete; requests: no duplicate
    actions: (input, { schemaType }) =>
      singletons.includes(schemaType)
        ? input.filter(({ action }) => action && ["publish", "discardChanges", "restore"].includes(action))
        : schemaType === "request"
          ? input.filter(({ action }) => action !== "duplicate")
          : input,
  },
  plugins: [structureTool({ structure, title: "Content" })],
  // Home is first, so /studio opens the landing page; Content stays at /studio/structure.
  tools: (prev) => [homeTool, ...prev, motionTool],
  apiVersion,
});
