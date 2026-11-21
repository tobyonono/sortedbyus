import { defineArrayMember, defineField, defineType, type FieldDefinition } from "sanity";
import brand from "../../../../motion/brand.json";
import cardJourney from "../../../../motion/templates/card-journey/template.json";
import sortFlash from "../../../../motion/templates/sort-flash/template.json";

/**
 * A motion studio composition (made in /studio/motion, or by an agent through Sanity's MCP server).
 * Generated from the template files in motion/templates, so the schema always matches what the studio
 * can draw. Field descriptions are written for people and for agents: they say what each value does and
 * which values are allowed. Brand rules: colours are palette names, springs come from motion/brand.json.
 */

type Spec = typeof sortFlash | typeof cardJourney;
type Ctl = { key: string; type: string; label: string; unit?: string; min?: number; max?: number; step?: number; hint?: string; options?: { value: string; label: string }[]; item?: { key: string; type: string; label: string }[] };

const TEMPLATES: Spec[] = [sortFlash, cardJourney];
const PALETTE = Object.keys(brand.palette);
const FORMATS = Object.entries(brand.formats).map(([value, f]) => ({ value, title: `${f.label} (${f.video.join("×")})` }));
const SPRINGS = Object.entries(brand.springs).map(([value, s]) => ({ value, title: s.label }));
const IMAGE_HELP =
  'A photo: a starter photo name (e.g. "boat", "gifts", "celebrations") or the URL of an image in this project\'s Sanity media library (cdn.sanity.io/images/…).';
const COLOUR_HELP = `A brand colour name: ${PALETTE.join(", ")}.`;

const camel = (id: string) => id.replace(/-(\w)/g, (_, c: string) => c.toUpperCase());

function field(c: Ctl, name: string): FieldDefinition {
  const description = [c.label, c.hint].filter(Boolean).join(". ");
  switch (c.type) {
    case "number":
      return defineField({
        name,
        title: c.label,
        type: "number",
        description: `${description}. ${c.min}–${c.max}${c.unit ? ` ${c.unit}` : ""}.`,
        validation: (r) => r.min(c.min!).max(c.max!),
      });
    case "colour":
      return defineField({ name, title: c.label, type: "string", description: `${description}. ${COLOUR_HELP}`, options: { list: PALETTE } });
    case "choice":
      return defineField({ name, title: c.label, type: "string", description, options: { list: c.options!.map((o) => ({ value: o.value, title: o.label })), layout: "radio" } });
    case "format":
      return defineField({ name, title: c.label, type: "string", description: "Which shape of video to show in the studio. Export can make any of them.", options: { list: FORMATS } });
    case "fps":
      return defineField({ name, title: c.label, type: "number", description: "Frames per second.", options: { list: brand.fps } });
    case "spring":
      return defineField({
        name,
        title: c.label,
        type: "object",
        description: `${description}. Set "preset" to one of: ${Object.keys(brand.springs).join(", ")}. The numbers are filled in from the preset when the studio opens it; set them yourself only for a custom spring.`,
        fields: [
          defineField({ name: "preset", type: "string", options: { list: SPRINGS } }),
          defineField({ name: "stiffness", type: "number" }),
          defineField({ name: "damping", type: "number" }),
          defineField({ name: "mass", type: "number" }),
          defineField({ name: "velocity", type: "number" }),
        ],
      });
    case "list":
      return defineField({
        name,
        title: c.label,
        type: "array",
        description: `${description}. Up to ${c.max}.`,
        validation: (r) => r.max(c.max!),
        of: [
          defineArrayMember({
            type: "object",
            name: `${name}Item`,
            fields: c.item!.map((i) =>
              defineField({
                name: i.key,
                title: i.label,
                type: "string",
                description: i.type === "image" ? IMAGE_HELP : i.type === "colour" ? COLOUR_HELP : i.label,
                ...(i.type === "colour" ? { options: { list: PALETTE } } : {}),
              }),
            ),
            preview: { select: { title: c.item!.find((i) => i.type === "text" && i.key !== "label")?.key ?? c.item![0].key, subtitle: "label" } },
          }),
        ],
      });
    default:
      return defineField({ name, title: c.label, type: "string", description });
  }
}

/** Controls with dotted keys ("colours.background") become nested objects. */
function fieldsFor(spec: Spec): FieldDefinition[] {
  const top: FieldDefinition[] = [];
  const groups = new Map<string, FieldDefinition[]>();
  for (const c of spec.controls as Ctl[]) {
    const [head, sub] = c.key.split(".");
    if (!sub) top.push(field(c, head));
    else {
      if (!groups.has(head)) groups.set(head, []);
      groups.get(head)!.push(field(c, sub));
    }
  }
  for (const [name, fields] of groups) top.push(defineField({ name, type: "object", fields }));
  return top;
}

export const motionComposition = defineType({
  name: "motionComposition",
  title: "Motion composition",
  type: "document",
  description:
    "A short brand video from a template in the motion studio (/studio/motion). Set `template`, then fill only that template's field. To render it, open /studio/motion?c=<document id>&export=<formats> in a browser.",
  fields: [
    defineField({ name: "title", type: "string", validation: (r) => r.required() }),
    defineField({
      name: "template",
      type: "string",
      description: TEMPLATES.map((t) => `"${t.id}": ${t.description}`).join(" "),
      options: { list: TEMPLATES.map((t) => ({ value: t.id, title: t.name })) },
      validation: (r) => r.required(),
    }),
    ...TEMPLATES.map((t) =>
      defineField({
        name: camel(t.id),
        title: t.name,
        type: "object",
        description: `Content for the "${t.id}" template. ${t.description}`,
        hidden: ({ document }) => document?.template !== t.id,
        fields: fieldsFor(t),
      }),
    ),
    defineField({
      name: "exports",
      type: "array",
      readOnly: true,
      description: "Videos rendered from this composition. Added by the studio; don't edit.",
      of: [
        defineArrayMember({
          type: "object",
          name: "motionExport",
          fields: [
            defineField({ name: "format", type: "string" }),
            defineField({ name: "fps", type: "number" }),
            defineField({ name: "seconds", type: "number" }),
            defineField({ name: "filename", type: "string" }),
            defineField({ name: "createdAt", type: "datetime" }),
            defineField({ name: "file", type: "file" }),
          ],
        }),
      ],
    }),
  ],
  preview: { select: { title: "title", subtitle: "template" } },
});
