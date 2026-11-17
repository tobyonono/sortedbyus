import { defineArrayMember, defineField, defineType } from "sanity";
import { UsersIcon } from "@sanity/icons/Users";
import { heading, line, para, photo, seoDescription } from "./fields";

export const aboutPage = defineType({
  name: "aboutPage",
  title: "About",
  type: "document",
  icon: UsersIcon,
  groups: [
    { name: "top", title: "Top of page", default: true },
    { name: "story", title: "Our story" },
    { name: "values", title: "What we stand for" },
    { name: "where", title: "Where we work & banner" },
    { name: "seo", title: "Search & sharing" },
  ],
  fields: [
    heading("heroHeading", "Main heading", "top"),
    para("heroIntro", "Intro", undefined, "top", 2),
    photo("heroImage", "Main photo", undefined, "top"),

    line("storyLabel", "Small label", undefined, "story"),
    line("storyHeading", "Heading", undefined, "story", 90),
    defineField({
      name: "story",
      title: "Story",
      type: "array",
      group: "story",
      description: "Use bold for the opening line if you like. Press Enter for a new paragraph.",
      of: [
        defineArrayMember({
          type: "block",
          styles: [{ title: "Paragraph", value: "normal" }],
          lists: [],
          marks: { decorators: [{ title: "Bold", value: "strong" }, { title: "Italic", value: "em" }], annotations: [] },
        }),
      ],
      validation: (r) => r.required(),
    }),

    defineField({ name: "storySignName", title: "Signed by", type: "string", group: "story", description: "The founder’s name, shown under the story like a signature." }),
    defineField({ name: "storySignRole", title: "Their role", type: "string", group: "story", initialValue: "Founder" }),

    line("valuesLabel", "Small label", undefined, "values"),
    line("valuesHeading", "Heading", undefined, "values"),
    defineField({
      name: "values",
      title: "Values",
      type: "array",
      group: "values",
      of: [
        defineArrayMember({
          type: "object",
          name: "value",
          fields: [
            defineField({ name: "title", title: "Title", type: "string", validation: (r) => r.required() }),
            defineField({ name: "body", title: "Text", type: "text", rows: 3, validation: (r) => r.required() }),
            defineField({ name: "buttonLabel", title: "Button text (optional)", type: "string" }),
            defineField({
              name: "buttonLink",
              title: "Button goes to",
              type: "string",
              description: "A page on this site, e.g. /how-it-works or /contact.",
              hidden: ({ parent }) => !parent?.buttonLabel,
            }),
            photo("image", "Photo"),
          ],
          preview: { select: { title: "title", subtitle: "body", media: "image" } },
        }),
      ],
    }),

    line("whereLabel", "Small label", undefined, "where"),
    line("whereHeading", "Heading", undefined, "where"),
    defineField({ name: "whereList", title: "Places", type: "array", group: "where", of: [{ type: "string" }], validation: (r) => r.required() }),
    photo("whereImage", "Photo", undefined, "where"),
    photo("closingImage", "Bottom banner photo", undefined, "where"),

    seoDescription(),
  ],
  preview: { prepare: () => ({ title: "About" }) },
});
