import { defineArrayMember, defineField, defineType } from "sanity";
import { TagIcon } from "@sanity/icons/Tag";
import { faqs, line, para, photo, photoBreak, seoDescription, titledItems } from "./fields";

export const service = defineType({
  name: "service",
  title: "Service",
  type: "document",
  icon: TagIcon,
  groups: [
    { name: "basics", title: "Basics", default: true },
    { name: "top", title: "Top of page" },
    { name: "offers", title: "What we can sort" },
    { name: "examples", title: "Example requests" },
    { name: "more", title: "Photo, questions & banner" },
    { name: "seo", title: "Search & sharing" },
  ],
  fields: [
    line("title", "Service name", "E.g. “Gifts & Celebrations”. Used in the menu, footer and page heading.", "basics", 40),
    defineField({
      name: "slug",
      title: "Web address",
      type: "slug",
      group: "basics",
      description: "The end of the page address, e.g. sortedbyus.com/services/gifts-celebrations. Changing it breaks links people have shared, so leave it unless you must.",
      options: { source: "title", maxLength: 60 },
      validation: (r) => r.required(),
    }),
    defineField({
      name: "order",
      title: "Position",
      type: "number",
      group: "basics",
      description: "1 shows first in the menu, footer and homepage grid.",
      validation: (r) => r.required().integer().min(1),
    }),
    line("short", "Button wording", "Finishes “Request …” on buttons. E.g. “a gift” makes “Request a gift”.", "basics", 20),
    para("tileSummary", "Homepage tile text", "One line under the service name in the homepage grid.", "basics", 2),
    photo("tileImage", "Homepage tile photo", "The photo on this service’s homepage tile.", "basics"),

    line("heroHeading", "Main heading", undefined, "top", 60),
    para("intro", "Intro", "One or two sentences. Also used as the Google description unless you set one under Search & sharing.", "top", 3),
    photo("heroImage", "Main photo", "Also used for this service in “More we can sort” on the other service pages.", "top"),

    titledItems("offers", "Things we can sort", "Six works best (two rows of three). Each card links to the Contact form with that request filled in.", "offers", 9),

    defineField({
      name: "examples",
      title: "Example requests (scrolling strip)",
      type: "array",
      group: "examples",
      description: "Eight short, real-sounding requests. Add a photo to the ones that should show one (two is ideal); the rest get a brand colour.",
      of: [
        defineArrayMember({
          type: "object",
          name: "example",
          fields: [
            defineField({ name: "label", title: "Label", type: "string", validation: (r) => r.required().max(20) }),
            defineField({ name: "text", title: "Request", type: "string", validation: (r) => r.required().max(70) }),
            { ...photo("image", "Photo (optional)", "Leave empty for a colour card. Pick a photo that matches the request."), validation: undefined },
          ],
          preview: { select: { title: "text", subtitle: "label", media: "image" } },
        }),
      ],
    }),

    photo("sideImage", "“One request, one clear quote” photo", "Shown beside the short how-it-works text.", "more"),
    ...photoBreak("more"),
    faqs("faqs", "Questions and answers", "more"),
    {
      ...photo("closingImage", "Bottom banner photo (optional)", "Leave empty to use the default banner photo. Set one if the default would repeat a photo already on this page.", "more"),
      validation: undefined,
    },

    seoDescription(),
  ],
  orderings: [{ title: "Position", name: "order", by: [{ field: "order", direction: "asc" }] }],
  preview: { select: { title: "title", subtitle: "heroHeading", media: "heroImage" } },
});
