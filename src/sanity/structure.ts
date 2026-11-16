import type { StructureResolver } from "sanity/structure";
import { CogIcon } from "@sanity/icons/Cog";
import { DocumentTextIcon } from "@sanity/icons/DocumentText";
import { InboxIcon } from "@sanity/icons/Inbox";
import { TagIcon } from "@sanity/icons/Tag";
import { DocumentsIcon } from "@sanity/icons/Documents";

const single = (S: Parameters<StructureResolver>[0], id: string, title: string) =>
  S.listItem().title(title).id(id).child(S.document().schemaType(id).documentId(id).title(title));

/** The Studio sidebar, in the order a marketer thinks about the site. */
export const structure: StructureResolver = (S) =>
  S.list()
    .title("Sorted by Us")
    .items([
      S.listItem()
        .title("Website requests")
        .icon(InboxIcon)
        .child(
          S.list()
            .title("Website requests")
            .items([
              S.listItem().title("New").child(S.documentList().title("New requests").filter('_type == "request" && status == "new"').defaultOrdering([{ field: "receivedAt", direction: "desc" }])),
              S.listItem().title("In progress").child(S.documentList().title("In progress").filter('_type == "request" && status == "progress"').defaultOrdering([{ field: "receivedAt", direction: "desc" }])),
              S.listItem().title("Done").child(S.documentList().title("Done").filter('_type == "request" && status == "done"').defaultOrdering([{ field: "receivedAt", direction: "desc" }])),
              S.divider(),
              S.listItem().title("All requests").child(S.documentList().title("All requests").filter('_type == "request"').defaultOrdering([{ field: "receivedAt", direction: "desc" }])),
            ]),
        ),
      S.divider(),
      single(S, "homePage", "Homepage"),
      S.listItem()
        .title("Services")
        .icon(TagIcon)
        .child(S.documentTypeList("service").title("Services").defaultOrdering([{ field: "order", direction: "asc" }])),
      S.listItem()
        .title("Pages")
        .icon(DocumentsIcon)
        .child(
          S.list()
            .title("Pages")
            .items([
              single(S, "howItWorksPage", "How it works"),
              single(S, "corporatePage", "Corporate"),
              single(S, "aboutPage", "About"),
              single(S, "contactPage", "Contact"),
            ]),
        ),
      S.listItem()
        .title("Legal")
        .icon(DocumentTextIcon)
        .child(S.documentTypeList("legalPage").title("Legal")),
      S.divider(),
      single(S, "siteSettings", "Site settings").icon(CogIcon),
    ]);
