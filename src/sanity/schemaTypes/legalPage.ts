import { defineArrayMember, defineField, defineType } from "sanity";
import { DocumentTextIcon } from "@sanity/icons/DocumentText";

export const legalPage = defineType({
  name: "legalPage",
  title: "Legal page",
  type: "document",
  icon: DocumentTextIcon,
  fields: [
    defineField({ name: "title", title: "Title", type: "string", validation: (r) => r.required() }),
    defineField({ name: "updated", title: "Last updated", type: "date", description: "Shown under the title." }),
    defineField({
      name: "sections",
      title: "Sections",
      type: "array",
      of: [
        defineArrayMember({
          type: "object",
          name: "section",
          fields: [
            defineField({ name: "heading", title: "Heading", type: "string", validation: (r) => r.required() }),
            defineField({ name: "body", title: "Text", type: "text", rows: 5, description: "Leave a blank line between paragraphs.", validation: (r) => r.required() }),
          ],
          preview: { select: { title: "heading", subtitle: "body" } },
        }),
      ],
    }),
    defineField({
      name: "seoDescription",
      title: "Search and sharing description",
      type: "text",
      rows: 2,
    }),
  ],
  preview: { select: { title: "title" } },
});
