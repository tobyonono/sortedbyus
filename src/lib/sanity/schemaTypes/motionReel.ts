import { defineArrayMember, defineField, defineType } from "sanity";
import brand from "../../../../motion/brand.json";

/**
 * A motion studio reel: compositions in order, with trims and transitions, rendered as one video.
 * Screens reference compositions (weak references, so drafts made by agents can be used); editing a
 * composition changes every reel that uses it. Made in /studio/motion or by an agent through Sanity's MCP.
 */
const FORMATS = Object.entries(brand.formats).map(([value, f]) => ({ value, title: `${f.label} (${f.video.join("×")})` }));
const SPRINGS = Object.entries(brand.springs).map(([value, s]) => ({ value, title: s.label }));

export const motionReel = defineType({
  name: "motionReel",
  title: "Motion reel",
  type: "document",
  description:
    "A longer video made of compositions in order. Each screen points at a motionComposition and says how it moves into the next. To render it, open /studio/motion?r=<document id>&export=<formats> in a browser.",
  fields: [
    defineField({ name: "title", type: "string", validation: (r) => r.required() }),
    defineField({ name: "format", type: "string", description: "Shape of the whole reel; every screen renders in it.", options: { list: FORMATS } }),
    defineField({ name: "fps", type: "number", description: "Frames per second.", options: { list: brand.fps } }),
    defineField({
      name: "screens",
      type: "array",
      description: "The compositions in order.",
      of: [
        defineArrayMember({
          type: "object",
          name: "reelScreen",
          fields: [
            defineField({
              name: "composition",
              type: "reference",
              weak: true,
              to: [{ type: "motionComposition" }],
              description: "The composition this screen plays (use its id without \"drafts.\").",
            }),
            defineField({ name: "trimStart", type: "number", description: "Seconds to skip at the start of the composition.", validation: (r) => r.min(0) }),
            defineField({ name: "trimEnd", type: "number", description: "Seconds to cut from the end of the composition.", validation: (r) => r.min(0) }),
            defineField({
              name: "transition",
              type: "object",
              description: "How this screen moves into the next one (ignored on the last screen).",
              fields: [
                defineField({
                  name: "type",
                  type: "string",
                  description: "smart: the same photo, or a line with the same words, glides from one screen to the next and the rest fades (title-card, photo-caption and photo-mosaic; others crossfade).",
                  options: { list: ["cut", "crossfade", "push", "slide", "smart"] },
                }),
                defineField({ name: "direction", type: "string", description: "For push and slide.", options: { list: ["left", "right", "up", "down"] } }),
                defineField({ name: "seconds", type: "number", description: "0.1–3 s.", validation: (r) => r.min(0.1).max(3) }),
                defineField({
                  name: "spring",
                  type: "object",
                  description: `Set "preset" to one of: ${Object.keys(brand.springs).join(", ")}.`,
                  fields: [
                    defineField({ name: "preset", type: "string", options: { list: SPRINGS } }),
                    defineField({ name: "stiffness", type: "number" }),
                    defineField({ name: "damping", type: "number" }),
                    defineField({ name: "mass", type: "number" }),
                    defineField({ name: "velocity", type: "number" }),
                  ],
                }),
              ],
            }),
          ],
          preview: { select: { title: "composition.title", subtitle: "transition.type" } },
        }),
      ],
    }),
    defineField({
      name: "exports",
      type: "array",
      readOnly: true,
      description: "Videos rendered from this reel. Added by the studio; don't edit.",
      of: [
        defineArrayMember({
          type: "object",
          name: "motionReelExport",
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
  preview: { select: { title: "title", subtitle: "format" } },
});
