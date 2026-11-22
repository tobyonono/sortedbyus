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

export const schemaTypes = [request, homePage, service, howItWorksPage, corporatePage, aboutPage, contactPage, legalPage, siteSettings, motionComposition, motionReel];

/** One-of-a-kind documents: no "create new" or "delete" in the Studio. */
export const singletons = ["homePage", "howItWorksPage", "corporatePage", "aboutPage", "contactPage", "siteSettings"];
