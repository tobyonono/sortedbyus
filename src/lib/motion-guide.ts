// Content for the motion studio guide (/motion/guide for people, /motion/guide.md for agents).
// Built from the template files and brand tokens, so it always matches what the studio can make.
import brand from "../../motion/brand.json";
import cardJourney from "../../motion/templates/card-journey/template.json";
import sortFlash from "../../motion/templates/sort-flash/template.json";
import { settleTime } from "../../motion/engine/spring";
import { site } from "./site";

type Ctl = { key: string; type: string; label: string; unit?: string; min?: number; max?: number; hint?: string; options?: { value: string; label: string }[]; item?: { key: string; type: string; label: string }[] };

export interface GuideField {
  path: string;
  label: string;
  accepts: string;
}

export interface GuideTemplate {
  id: string;
  name: string;
  description: string;
  field: string;
  fields: GuideField[];
  photos: string[];
}

const camel = (id: string) => id.replace(/-(\w)/g, (_, c: string) => c.toUpperCase());

function accepts(c: Ctl): string {
  switch (c.type) {
    case "text":
      return "text";
    case "number":
      return `number, ${c.min}–${c.max}${c.unit ? ` ${c.unit}` : ""}`;
    case "colour":
      return "a brand colour name";
    case "choice":
      return c.options!.map((o) => `"${o.value}"`).join(" or ");
    case "format":
      return Object.keys(brand.formats).map((f) => `"${f}"`).join(", ");
    case "fps":
      return brand.fps.join(", ");
    case "spring":
      return `{ "preset": one of ${Object.keys(brand.springs).map((s) => `"${s}"`).join(", ")} }`;
    case "list":
      return `list of up to ${c.max}, each { ${c.item!.map((i) => `${i.key}: ${i.type === "image" ? "photo" : i.type === "colour" ? "brand colour" : "text"}`).join(", ")} }`;
    default:
      return c.type;
  }
}

export function motionGuide() {
  const templates: GuideTemplate[] = [sortFlash, cardJourney].map((t) => {
    const defaults = t.defaults as Record<string, unknown>;
    const photos = new Set<string>();
    JSON.stringify(defaults, (k, v) => (k === "image" && typeof v === "string" && v ? (photos.add(v.replace(/\.[a-z]+$/, "")), v) : v));
    return {
      id: t.id,
      name: t.name,
      description: t.description,
      field: camel(t.id),
      fields: (t.controls as Ctl[]).map((c) => ({ path: c.key, label: c.label + (c.hint ? ` (${c.hint.toLowerCase()})` : ""), accepts: accepts(c) })),
      photos: [...photos],
    };
  });
  const springs = Object.entries(brand.springs).map(([key, s]) => ({ key, label: s.label, settle: settleTime(s) }));
  const palette = Object.entries(brand.palette).map(([name, hex]) => ({ name, hex }));
  const formats = Object.entries(brand.formats).map(([key, f]) => ({ key, label: f.label, size: f.video.join("×") }));
  const studio = `${site.url}/studio/motion`;
  return { templates, springs, palette, formats, studio, mcp: "https://mcp.sanity.io", site };
}

/** Plain markdown for agents. */
export function motionGuideMarkdown() {
  const g = motionGuide();
  const starter = [...new Set(g.templates.flatMap((t) => t.photos))].sort();
  return `# ${g.site.name} motion studio: guide for agents

Make short on-brand videos for ${g.site.name} from templates. You write a composition in Sanity; the studio renders it.

## 1. Connect
Use Sanity's MCP server: ${g.mcp} (OAuth). You act with the signed-in person's Sanity role.
Claude Code: \`claude mcp add Sanity -t http ${g.mcp} --scope user\`. Claude / ChatGPT / Codex: add ${g.mcp} as a remote MCP server or custom connector.

## 2. Create a composition
Create a document of type \`motionComposition\` (it will be a draft) with:
- \`title\`: a short name
- \`template\`: ${g.templates.map((t) => `"${t.id}"`).join(" or ")}
- the template's field (\`${g.templates.map((t) => t.field).join("` or `")}\`) holding the values below.
Only fill the field for the template you chose. Leave out anything you don't need; the studio fills defaults.

Use real content from the site where it helps (services, requests, copy) and photos from its media library.

${g.templates
  .map(
    (t) => `### ${t.name} (\`template: "${t.id}"\`, field \`${t.field}\`)
${t.description}

| Path | What it is | Accepts |
| --- | --- | --- |
${t.fields.map((f) => `| \`${t.field}.${f.path}\` | ${f.label} | ${f.accepts} |`).join("\n")}
`,
  )
  .join("\n")}
## Brand rules
- Colours (use the name): ${g.palette.map((p) => `${p.name} ${p.hex}`).join(", ")}.
- Springs (set \`{ "preset": "<name>" }\`): ${g.springs.map((s) => `${s.key} (settles in ${s.settle.toFixed(2)} s)`).join(", ")}.
- Formats: ${g.formats.map((f) => `${f.key} ${f.size}`).join(", ")}.
- Photos: a starter name (${starter.join(", ")}) or an image URL from the Sanity media library, found with \`*[_type == "sanity.imageAsset"]{url, originalFilename}\`.
- Requests read as short asks in sentence case, without quote marks (the template adds them).

## 3. Render
Open this in a browser, signed in to Sanity:
${g.studio}?c=<document id without "drafts.">&export=<formats, comma-separated>
e.g. ${g.studio}?c=abc123&export=story,portrait
The studio renders each format and saves the MP4s to Sanity under the composition's \`exports\`. The page title changes to "Export done: …" when finished. Read the files with \`*[_id in [$id, "drafts." + $id]][0].exports[]{format, seconds, "url": file.asset->url}\`.

## 4. Hand over
Reply with the studio link (${g.studio}?c=<id>) and the video links. A person reviews it in the studio and publishes the draft.
`;
}
