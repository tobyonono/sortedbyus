import { defineArrayMember, defineField, defineType } from "sanity";
import { HomeIcon } from "@sanity/icons/Home";
import { faqs, heading, line, para, photo, seoDescription } from "./fields";

export const homePage = defineType({
  name: "homePage",
  title: "Homepage",
  type: "document",
  icon: HomeIcon,
  groups: [
    { name: "hero", title: "1 · Top of page", default: true },
    { name: "offer", title: "2 · What we offer" },
    { name: "examples", title: "3 · Example requests" },
    { name: "process", title: "4 · How we get it sorted" },
    { name: "who", title: "5 · Who we help" },
    { name: "faq", title: "6 · Questions" },
    { name: "closing", title: "7 · Bottom banner" },
    { name: "seo", title: "Search & sharing" },
  ],
  fields: [
    heading("heroHeading", "Main heading", "hero"),
    defineField({
      name: "heroSubline",
      title: "Line under the heading",
      type: "string",
      group: "hero",
      description: "Optional. One short line, e.g. who it’s for. Leave empty to show just the heading.",
      validation: (r) => r.max(90),
    }),
    line("heroButton", "Button text", "Scrolls down to the services.", "hero", 30),
    photo("heroImage", "Main photo", undefined, "hero"),

    line("offerLabel", "Small label", undefined, "offer"),
    line("offerHeading", "Heading", undefined, "offer"),
    para("offerIntro", "Intro", "The six service tiles under this come from Services (each service’s “Homepage tile”).", "offer"),
    line("catchallLabel", "“Something else?” small label", undefined, "offer"),
    line("catchallHeading", "“Something else?” heading", undefined, "offer"),
    para("catchallBody", "“Something else?” text", undefined, "offer", 2),
    line("catchallButton", "“Something else?” button", undefined, "offer", 30),
    photo("catchallImage", "“Something else?” photo", "Sits on the right of the green banner. Set the focal point on the right-hand side.", "offer"),

    line("examplesLabel", "Small label", undefined, "examples"),
    line("examplesHeading", "Heading", undefined, "examples"),
    defineField({
      name: "examples",
      title: "Example requests (scrolling strip)",
      type: "array",
      group: "examples",
      description: "Short, real-sounding requests. Cards with a photo show the photo; the rest get a brand colour. Aim for 8 to 10, about half with photos.",
      of: [
        defineArrayMember({
          type: "object",
          name: "example",
          fields: [
            defineField({ name: "label", title: "Label", type: "string", description: "One or two words, e.g. “Gifts”.", validation: (r) => r.required().max(20) }),
            defineField({ name: "text", title: "Request", type: "string", validation: (r) => r.required().max(70) }),
            { ...photo("image", "Photo (optional)", "Leave empty for a colour card."), validation: undefined },
          ],
          preview: { select: { title: "text", subtitle: "label", media: "image" } },
        }),
      ],
    }),

    line("processHeading", "Heading", undefined, "process"),
    defineField({
      name: "processSteps",
      title: "Steps",
      type: "array",
      group: "process",
      validation: (r) => r.min(2).max(6),
      of: [
        defineArrayMember({
          type: "object",
          name: "step",
          fields: [
            defineField({ name: "title", title: "Step name", type: "string", validation: (r) => r.required().max(20) }),
            defineField({ name: "body", title: "Text", type: "text", rows: 3, validation: (r) => r.required() }),
            photo("image", "Photo"),
          ],
          preview: { select: { title: "title", subtitle: "body", media: "image" } },
        }),
      ],
    }),

    line("whoLabel", "Small label", undefined, "who"),
    line("whoHeading", "Heading", undefined, "who"),
    para("whoIntro", "Intro", undefined, "who", 2),
    defineField({
      name: "audiences",
      title: "Audiences (photo left, text right)",
      type: "array",
      group: "who",
      of: [
        defineArrayMember({
          type: "object",
          name: "audience",
          fields: [
            defineField({ name: "label", title: "Small label", type: "string", validation: (r) => r.required() }),
            defineField({ name: "heading", title: "Heading", type: "string", validation: (r) => r.required() }),
            defineField({ name: "body", title: "Text", type: "text", rows: 3, validation: (r) => r.required() }),
            defineField({ name: "button", title: "Button text", type: "string", initialValue: "Make a request", validation: (r) => r.required() }),
            photo("image", "Photo"),
          ],
          preview: { select: { title: "heading", subtitle: "label", media: "image" } },
        }),
      ],
    }),
    line("corpLabel", "Corporate banner: small label", undefined, "who"),
    heading("corpHeading", "Corporate banner: heading", "who"),
    para("corpBody", "Corporate banner: text", undefined, "who", 2),
    line("corpButton", "Corporate banner: button", "Opens WhatsApp with a corporate enquiry ready to send.", "who", 40),
    photo("corpImage", "Corporate banner: photo", "Shows on the left of the brown banner.", "who"),

    line("faqHeading", "Heading", undefined, "faq"),
    faqs("faqs", "Questions and answers", "faq"),

    line("closingHeading", "Heading", "Its words sit on staggered levels and come in one at a time.", "closing"),
    defineField({
      name: "closingLevels",
      title: "Heading levels (optional)",
      description: "The level of each word in turn: 0 = middle, 1 = a line up, -1 = a line down, e.g. 0,1,0,-1 (the default). The pattern repeats if there are more words.",
      type: "string",
      group: "closing",
      validation: (r) => r.regex(/^\s*-?[01](\s*,\s*-?[01])*\s*$/, { name: "levels like 0,1,0,-1" }),
    }),
    line("closingButton", "Button text", undefined, "closing", 30),
    photo("closingImage", "Photo", "Full-width banner. Wide photos work best.", "closing"),

    seoDescription(),
  ],
  preview: { prepare: () => ({ title: "Homepage" }) },
});
