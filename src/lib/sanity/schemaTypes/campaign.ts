import { defineArrayMember, defineField, defineType } from "sanity";
import { RocketIcon } from "@sanity/icons/Rocket";
import brand from "../../../../motion/brand.json";

/**
 * A campaign: what ships together across the website, motion and email, linked by reference so
 * people, tools and agents can answer "what's in this campaign, what's approved, what's missing?"
 * by following links rather than matching titles. Pages and services are the site's own documents;
 * motion is reels and compositions from /studio/motion; final videos are their exported files.
 */
const PAGE_TYPES = ["homePage", "service", "howItWorksPage", "corporatePage", "aboutPage", "contactPage"];

export const campaign = defineType({
  name: "campaign",
  title: "Campaign",
  type: "document",
  icon: RocketIcon,
  description:
    "A campaign links what ships together: services, website pages, motion (reels and compositions), the final approved videos and emails. Follow the references to see what's ready and what's missing.",
  fields: [
    defineField({ name: "title", type: "string", validation: (r) => r.required() }),
    defineField({
      name: "status",
      type: "string",
      initialValue: "planning",
      options: {
        list: [
          { value: "planning", title: "Planning" },
          { value: "inProduction", title: "In production" },
          { value: "live", title: "Live" },
          { value: "done", title: "Done" },
        ],
        layout: "radio",
        direction: "horizontal",
      },
    }),
    defineField({ name: "startDate", title: "Starts", type: "date" }),
    defineField({ name: "endDate", title: "Ends", type: "date" }),
    defineField({ name: "brief", type: "text", rows: 5, description: "What it's for, who it's for and the one thing it should say." }),
    defineField({
      name: "services",
      type: "array",
      description: "The services this campaign is about.",
      of: [defineArrayMember({ type: "reference", to: [{ type: "service" }] })],
    }),
    defineField({
      name: "pages",
      title: "Website pages",
      type: "array",
      description: "Pages the campaign sends people to or changes.",
      of: [defineArrayMember({ type: "reference", to: PAGE_TYPES.map((type) => ({ type })) })],
    }),
    defineField({
      name: "motion",
      type: "array",
      description: "Reels and compositions made for it in /studio/motion (drafts allowed).",
      of: [defineArrayMember({ type: "reference", weak: true, to: [{ type: "motionReel" }, { type: "motionComposition" }] })],
    }),
    defineField({
      name: "finalVideos",
      title: "Final videos",
      type: "array",
      description: "The exported files that go out. Mark each export's channels in the studio's Exports list too.",
      // file fields: each holds a reference to the exported video's sanity.fileAsset
      of: [defineArrayMember({ type: "file", options: { accept: "video/*" } })],
    }),
    defineField({
      name: "emails",
      type: "array",
      description: "Emails for this campaign, wherever they're written.",
      of: [
        defineArrayMember({
          type: "object",
          name: "campaignEmail",
          fields: [
            defineField({ name: "subject", type: "string", validation: (r) => r.required() }),
            defineField({
              name: "status",
              type: "string",
              initialValue: "draft",
              options: { list: ["draft", "scheduled", "sent"].map((v) => ({ value: v, title: v[0].toUpperCase() + v.slice(1) })) },
            }),
            defineField({ name: "sendDate", title: "Send date", type: "date" }),
            defineField({ name: "link", type: "url", description: "Where the email lives (your email tool)." }),
            defineField({ name: "notes", type: "text", rows: 2 }),
          ],
          preview: { select: { title: "subject", subtitle: "status" } },
        }),
      ],
    }),
    defineField({
      name: "channels",
      type: "array",
      description: "Where it goes out.",
      of: [{ type: "string" }],
      options: { list: brand.channels.map((c) => ({ value: c.value, title: c.label })) },
    }),
  ],
  orderings: [{ title: "Starts, newest first", name: "startDesc", by: [{ field: "startDate", direction: "desc" }] }],
  preview: {
    select: { title: "title", status: "status", start: "startDate" },
    prepare: ({ title, status, start }) => ({
      title,
      subtitle: [status === "inProduction" ? "In production" : status ? status[0].toUpperCase() + status.slice(1) : "", start].filter(Boolean).join(" · "),
    }),
  },
});
