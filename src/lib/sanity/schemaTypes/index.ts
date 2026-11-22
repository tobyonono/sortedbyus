import { defineSingleton } from "sanity";
import { siteSettings } from "./siteSettings";
import { homePage } from "./homePage";
import { service } from "./service";
import { howItWorksPage } from "./howItWorksPage";
import { corporatePage } from "./corporatePage";
import { aboutPage } from "./aboutPage";
import { contactPage } from "./contactPage";
import { legalPage } from "./legalPage";
import { request } from "./request";
import { motionComposition } from "./motionComposition";
import { motionReel } from "./motionReel";
import { campaign } from "./campaign";

export const schemaTypes = [request, homePage, service, howItWorksPage, corporatePage, aboutPage, contactPage, legalPage, siteSettings, motionComposition, motionReel, campaign];

/**
 * One-of-a-kind documents, registered with the Studio's singletons API (sanity.config.ts): Sanity keeps
 * them out of every "create" menu and reference input, removes Duplicate, badges them and gives the
 * sidebar ready-made list items (structure.ts). Document id = schema type for each.
 */
export const singletonDefinitions = [
  defineSingleton({ documentId: "homePage", schemaType: "homePage", title: "Homepage" }),
  defineSingleton({ documentId: "howItWorksPage", schemaType: "howItWorksPage", title: "How it works" }),
  defineSingleton({ documentId: "corporatePage", schemaType: "corporatePage", title: "Corporate" }),
  defineSingleton({ documentId: "aboutPage", schemaType: "aboutPage", title: "About" }),
  defineSingleton({ documentId: "contactPage", schemaType: "contactPage", title: "Contact" }),
  defineSingleton({ documentId: "siteSettings", schemaType: "siteSettings", title: "Site settings" }),
];
