import { defineArrayMember, defineField, defineType } from "sanity";
import { CaseIcon } from "@sanity/icons/Case";
import { faqs, heading, line, para, photo, seoDescription } from "./fields";

export const corporatePage = defineType({
  name: "corporatePage",
  title: "Corporate",
  type: "document",
  icon: CaseIcon,
  groups: [
    { name: "top", title: "Top of page", default: true },
    { name: "offers", title: "What we handle" },
    { name: "people", title: "Support beyond the office" },
    { name: "models", title: "Ways to work with us" },
    { name: "faq", title: "Questions & banner" },
    { name: "seo", title: "Search & sharing" },
  ],
  fields: [
    heading("heroHeading", "Main heading", "top"),
    para("heroIntro", "Intro", undefined, "top", 2),
    photo("heroImage", "Main photo", undefined, "top"),
    line("ctaLabel", "Main button text", "Used on the buttons that open WhatsApp with a corporate enquiry.", "top", 40),

    line("offersLabel", "Small label", undefined, "offers"),
    line("offersHeading", "Heading", undefined, "offers"),
    para("offersIntro", "Intro", undefined, "offers", 2),
    defineField({
      name: "offers",
      title: "Tabs",
      type: "array",
      group: "offers",
      of: [
        defineArrayMember({
          type: "object",
          name: "offer",
          fields: [
            defineField({ name: "title", title: "Tab name", type: "string", validation: (r) => r.required().max(30) }),
            defineField({ name: "body", title: "Text", type: "text", rows: 3, validation: (r) => r.required() }),
            defineField({ name: "items", title: "Bullet points", type: "array", of: [{ type: "string" }], validation: (r) => r.max(4) }),
            photo("image", "Photo"),
          ],
          preview: { select: { title: "title", subtitle: "body", media: "image" } },
        }),
      ],
    }),

    line("peopleLabel", "Small label", undefined, "people"),
    line("peopleHeading", "Heading", undefined, "people"),
    defineField({
      name: "people",
      title: "Timeline items",
      type: "array",
      group: "people",
      of: [
        defineArrayMember({
          type: "object",
          name: "item",
          fields: [
            defineField({ name: "title", title: "Title", type: "string", validation: (r) => r.required() }),
            defineField({ name: "body", title: "Text", type: "text", rows: 3, validation: (r) => r.required() }),
            defineField({ name: "showButton", title: "Show the WhatsApp button under this one", type: "boolean", initialValue: false }),
            photo("image", "Photo"),
          ],
          preview: { select: { title: "title", subtitle: "body", media: "image" } },
        }),
      ],
    }),

    line("modelsLabel", "Small label", undefined, "models"),
    line("modelsHeading", "Heading", undefined, "models"),
    para("modelsIntro", "Intro", undefined, "models", 2),
    defineField({
      name: "models",
      title: "Cards",
      type: "array",
      group: "models",
      description: "Three cards. Their colour bands go from lightest to darkest brown, left to right.",
      validation: (r) => r.max(3),
      of: [
        defineArrayMember({
          type: "object",
          name: "model",
          fields: [
            defineField({ name: "title", title: "Title", type: "string", validation: (r) => r.required() }),
            defineField({ name: "body", title: "Text", type: "text", rows: 3, validation: (r) => r.required() }),
            defineField({ name: "bestFor", title: "Best for…", type: "string", description: "Sits on the colour band.", validation: (r) => r.required() }),
          ],
          preview: { select: { title: "title", subtitle: "bestFor" } },
        }),
      ],
    }),

    faqs("faqs", "Questions and answers", "faq"),
    line("closingHeading", "Bottom banner heading", undefined, "faq"),
    photo("closingImage", "Bottom banner photo", undefined, "faq"),

    seoDescription(),
  ],
  preview: { prepare: () => ({ title: "Corporate" }) },
});
