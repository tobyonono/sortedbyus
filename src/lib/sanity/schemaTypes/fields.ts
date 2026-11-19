import { defineArrayMember, defineField } from "sanity";

/** A photo with a focal point (click the image to set it) and a required description. */
export const photo = (name: string, title: string, description?: string, group?: string) =>
  defineField({
    name,
    title,
    type: "image",
    group,
    description:
      description ??
      "Upload the largest, sharpest version you have (at least 2000px wide). Click “Edit” on the image to set the focal point, so the important part is never cropped out.",
    options: { hotspot: true },
    validation: (r) => r.required().assetRequired(),
    fields: [
      defineField({
        name: "alt",
        title: "Describe the photo",
        type: "string",
        description: "One short sentence for people who can’t see it, and for Google. E.g. “A woman smiling at her phone”.",
        validation: (r) => r.required().max(140),
      }),
    ],
  });

export const optionalPhoto = (name: string, title: string, description: string, group?: string) => {
  const f = photo(name, title, description, group);
  return { ...f, validation: undefined };
};

/** Short single line (labels, buttons). */
export const line = (name: string, title: string, description?: string, group?: string, max = 80) =>
  defineField({ name, title, type: "string", group, description, validation: (r) => r.required().max(max) });

/** A few sentences. */
export const para = (name: string, title: string, description?: string, group?: string, rows = 3) =>
  defineField({ name, title, type: "text", rows, group, description, validation: (r) => r.required() });

/** Heading where a new line in the box becomes a line break on the page. */
export const heading = (name: string, title: string, group?: string) =>
  defineField({
    name,
    title,
    type: "text",
    rows: 2,
    group,
    description: "Press Enter to choose where the line breaks on large screens.",
    validation: (r) => r.required().max(90),
  });

export const faqs = (name = "faqs", title = "Questions and answers", group?: string) =>
  defineField({
    name,
    title,
    type: "array",
    group,
    description: "Drag to reorder. The first one opens automatically.",
    of: [
      defineArrayMember({
        type: "object",
        name: "faq",
        fields: [
          defineField({ name: "q", title: "Question", type: "string", validation: (r) => r.required() }),
          defineField({ name: "a", title: "Answer", type: "text", rows: 3, validation: (r) => r.required() }),
        ],
        preview: { select: { title: "q", subtitle: "a" } },
      }),
    ],
  });

/** A title + a sentence or two (cards, bullet points). */
export const titledItems = (name: string, title: string, description?: string, group?: string, max?: number) =>
  defineField({
    name,
    title,
    type: "array",
    group,
    description,
    validation: max ? (r) => r.max(max) : undefined,
    of: [
      defineArrayMember({
        type: "object",
        name: "item",
        fields: [
          defineField({ name: "title", title: "Title", type: "string", validation: (r) => r.required() }),
          defineField({ name: "body", title: "Text", type: "text", rows: 3, validation: (r) => r.required() }),
        ],
        preview: { select: { title: "title", subtitle: "body" } },
      }),
    ],
  });

export const seoDescription = (group = "seo") =>
  defineField({
    name: "seoDescription",
    title: "Search and sharing description",
    type: "text",
    rows: 2,
    group,
    description: "Shown under the page title in Google and when the link is shared. Around 150 characters.",
    validation: (r) => r.max(170).warning("Google cuts off longer descriptions."),
  });

/** The page's short phrase, shown as the footer banner's headline on staggered levels. (It began as the
 *  full-width photo break, now hidden; its photo field stays, out of sight, in case it comes back.) */
export const photoBreak = (group?: string) => [
  defineField({
    name: "breakText",
    title: "Footer banner phrase",
    description: "The bottom banner’s headline. Five words at most. Leave empty to use the standard banner heading.",
    type: "string",
    group,
    validation: (r) => r.custom((v) => (v && v.trim().split(/\s+/).length > 5 ? "Five words at most" : true)),
  }),
  defineField({
    name: "breakLevels",
    title: "Footer banner phrase levels (optional)",
    description: "Fill in to set the phrase on staggered levels, its words coming in one at a time. Save it for one or two standout phrases. The level of each word in turn: 0 = middle, 1 = a line up, -1 = a line down, e.g. 0,1,0,-1. Empty = a plain heading.",
    type: "string",
    group,
    validation: (r) => r.regex(/^\s*-?[01](\s*,\s*-?[01])*\s*$/, { name: "levels like 0,1,0,-1" }),
  }),
  {
    ...photo("breakImage", "Photo break photo", undefined, group),
    hidden: true,
    validation: undefined,
  },
];
