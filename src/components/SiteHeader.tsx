import Header from "./Header";
import { getSite } from "@/sanity/site";

/** The header, with the service menu and contact details from Sanity. */
export default async function SiteHeader() {
  const { nav, settings, wa } = await getSite();
  return <Header services={nav} whatsappHref={wa()} whatsappDisplay={settings.whatsappDisplay} email={settings.email} />;
}
