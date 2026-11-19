import { defineArrayMember, defineField, defineType } from "sanity";
import { BulbOutlineIcon } from "@sanity/icons/BulbOutline";
import { faqs, heading, line, para, photo, photoBreak, seoDescription, titledItems } from "./fields";

export const howItWorksPage = defineType({
  name: "howItWorksPage",
  title: "How it works",
  type: "document",
  icon: BulbOutlineIcon,
  groups: [
    { name: "top", title: "Top of page", default: true },
    { name: "steps", title: "The four steps" },
    { name: "behind", title: "Behind the scenes" },
    { name: "costs", title: "Costs & payment" },
    { name: "wrong", title: "If something goes wrong" },
    { name: "faq", title: "Questions & banner" },
    { name: "seo", title: "Search & sharing" },
  ],
  fields: [
    heading("heroHeading", "Main heading", "top"),
    para("heroIntro", "Intro", undefined, "top", 2),
    photo("heroImage", "Main photo", undefined, "top"),

    line("stepsLabel", "Small label", undefined, "steps"),
    line("stepsHeading", "Heading", undefined, "steps"),
    para("stepsIntro", "Intro", undefined, "steps", 2),
    defineField({
      name: "steps",
      title: "Steps",
      type: "array",
      group: "steps",
      of: [
        defineArrayMember({
          type: "object",
          name: "step",
          fields: [
            defineField({ name: "title", title: "Step name", type: "string", validation: (r) => r.required().max(20) }),
            defineField({
              name: "body",
              title: "Text",
              type: "text",
              rows: 6,
              description: "One or two short paragraphs: what the client does, what we do and how long it takes. Leave a blank line between paragraphs.",
              validation: (r) => r.required(),
            }),
            photo("image", "Photo"),
          ],
          preview: { select: { title: "title", subtitle: "body", media: "image" } },
        }),
      ],
    }),

    line("behindLabel", "Small label", undefined, "behind"),
    line("behindHeading", "Heading", "The map animation under this heading stays as it is.", "behind", 90),
    titledItems("behindPoints", "Points under the map", "Four work best.", "behind", 4),
    ...photoBreak("faq"),

    line("costsLabel", "Small label", undefined, "costs"),
    line("costsHeading", "Heading", undefined, "costs"),
    titledItems("costs", "Points", undefined, "costs"),

    line("wrongLabel", "Small label", undefined, "wrong"),
    line("wrongHeading", "Heading", undefined, "wrong"),
    para("wrongIntro", "Intro", undefined, "wrong", 2),
    titledItems("wrong", "Cards", "Four, shown in a row.", "wrong", 4),

    faqs("faqs", "Questions and answers", "faq"),
    line("closingHeading", "Bottom banner heading", undefined, "faq"),
    photo("closingImage", "Bottom banner photo", undefined, "faq"),

    seoDescription(),
  ],
  preview: { prepare: () => ({ title: "How it works" }) },
});
