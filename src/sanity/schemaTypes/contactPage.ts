import { defineType } from "sanity";
import { EnvelopeIcon } from "@sanity/icons/Envelope";
import { heading, line, para, photo, seoDescription } from "./fields";

export const contactPage = defineType({
  name: "contactPage",
  title: "Contact",
  type: "document",
  icon: EnvelopeIcon,
  groups: [
    { name: "top", title: "Top of page", default: true },
    { name: "form", title: "Form" },
    { name: "seo", title: "Search & sharing" },
  ],
  fields: [
    heading("heroHeading", "Main heading", "top"),
    para("heroIntro", "Intro", undefined, "top", 2),
    photo("heroImage", "Main photo", undefined, "top"),
    line("formLabel", "Small label", undefined, "form"),
    line("formHeading", "Heading", undefined, "form"),
    para("formIntro", "Text above the contact details", "Phone, email and hours come from Site settings.", "form", 2),
    seoDescription(),
  ],
  preview: { prepare: () => ({ title: "Contact" }) },
});
