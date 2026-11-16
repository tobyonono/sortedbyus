import { defineField, defineType } from "sanity";
import { CogIcon } from "@sanity/icons/Cog";

export const siteSettings = defineType({
  name: "siteSettings",
  title: "Site settings",
  type: "document",
  icon: CogIcon,
  fields: [
    defineField({
      name: "whatsappNumber",
      title: "WhatsApp number (for links)",
      type: "string",
      description: "International format, digits only, no + or spaces. E.g. 2348012345678. Every “WhatsApp us” button uses this.",
      validation: (r) => r.required().regex(/^\d{10,15}$/, { name: "digits only" }),
    }),
    defineField({
      name: "whatsappDisplay",
      title: "WhatsApp number (as shown)",
      type: "string",
      description: "How the number is written on the site. E.g. +234 801 234 5678.",
      validation: (r) => r.required(),
    }),
    defineField({ name: "email", title: "Email address", type: "string", validation: (r) => r.required().email() }),
    defineField({ name: "instagram", title: "Instagram link", type: "url" }),
    defineField({ name: "linkedin", title: "LinkedIn link", type: "url" }),
    defineField({
      name: "hours",
      title: "Opening hours",
      type: "string",
      description: "Shown on the Contact page. E.g. Monday to Saturday, 8am to 8pm (WAT).",
    }),
    defineField({
      name: "description",
      title: "Short description of the business",
      type: "text",
      rows: 3,
      description: "Used by Google, link previews and AI assistants when nothing more specific is set.",
      validation: (r) => r.required().max(200),
    }),
  ],
  preview: { prepare: () => ({ title: "Site settings" }) },
});
