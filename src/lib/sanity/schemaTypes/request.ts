import { defineField, defineType } from "sanity";
import { InboxIcon } from "@sanity/icons/Inbox";

const ro = { readOnly: true } as const;

/** Form submissions from the website. Everything except Status is filled in by the site. */
export const request = defineType({
  name: "request",
  title: "Website request",
  type: "document",
  icon: InboxIcon,
  fields: [
    defineField({
      name: "status",
      title: "Status",
      type: "string",
      options: {
        list: [
          { title: "New", value: "new" },
          { title: "In progress", value: "progress" },
          { title: "Done", value: "done" },
          { title: "Spam / not relevant", value: "spam" },
        ],
        layout: "radio",
        direction: "horizontal",
      },
      initialValue: "new",
    }),
    defineField({ name: "receivedAt", title: "Received", type: "datetime", ...ro }),
    defineField({ name: "form", title: "Sent from", type: "string", ...ro }),
    defineField({ name: "name", title: "Name", type: "string", ...ro }),
    defineField({ name: "phone", title: "Phone / WhatsApp", type: "string", ...ro }),
    defineField({ name: "email", title: "Email", type: "string", ...ro }),
    defineField({ name: "service", title: "Service", type: "string", ...ro }),
    defineField({ name: "subject", title: "Subject", type: "string", ...ro }),
    defineField({ name: "when", title: "When", type: "string", ...ro }),
    defineField({ name: "where", title: "Where", type: "string", ...ro }),
    defineField({ name: "message", title: "Message", type: "text", rows: 6, ...ro }),
    defineField({ name: "page", title: "Page", type: "string", ...ro }),
    defineField({ name: "notes", title: "Your notes", type: "text", rows: 4, description: "Private notes for the team. Never shown on the site." }),
  ],
  orderings: [{ title: "Newest first", name: "newest", by: [{ field: "receivedAt", direction: "desc" }] }],
  preview: {
    select: { name: "name", service: "service", status: "status", at: "receivedAt" },
    prepare: ({ name, service, status, at }) => ({
      title: `${status === "new" ? "● " : ""}${name || "No name"}`,
      subtitle: [service, at && new Date(at).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })].filter(Boolean).join(" · "),
    }),
  },
});
