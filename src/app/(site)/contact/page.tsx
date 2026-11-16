import { pageMeta } from "@/lib/seo";
import PageHero from "../_ui/PageHero";
import Footer from "../_ui/Footer";
import ContactForm from "../_ui/ContactForm";
import { getContact } from "@/sanity/queries";
import { getSite } from "@/sanity/site";
import { must } from "@/sanity/image";
import { Lines } from "@/lib/text";
import h from "../../home.module.css";
import d from "../_ui/pages.module.css";

import type { Metadata } from "next";
export async function generateMetadata(): Promise<Metadata> {
  const c = await getContact();
  return pageMeta({ title: "Contact", description: c.seoDescription || c.heroIntro, path: "/contact" });
}

export default async function ContactPage() {
  const [c, { settings, services, wa }] = await Promise.all([getContact(), getSite()]);
  const details = [
    { k: "WhatsApp", v: settings.whatsappDisplay, href: wa(), note: "The quickest way to reach us" },
    { k: "Email", v: settings.email, href: `mailto:${settings.email}` },
    ...(settings.instagram ? [{ k: "Instagram", v: "@sortedbyus", href: settings.instagram }] : []),
    ...(settings.linkedin ? [{ k: "LinkedIn", v: "Sorted by Us", href: settings.linkedin }] : []),
    ...(settings.hours ? [{ k: "Hours", v: settings.hours }] : []),
    { k: "Based in", v: "Lagos, with a team on the ground in Abuja" },
  ] as { k: string; v: string; href?: string; note?: string }[];

  return (
    <>
      <PageHero
        label="Contact us"
        title={<Lines text={c.heroHeading} />}
        intro={c.heroIntro}
        image={must(c.heroImage)}
      />
      <main>
        <section className={`${d.section} ${d.tinted}`} aria-labelledby="form-heading">
          <div className={d.formWrap}>
            <div>
              <p className={h.label} style={{ marginBottom: 16 }}>{c.formLabel}</p>
              <h2 id="form-heading" className={d.rowHeading}>{c.formHeading}</h2>
              <p className={d.rowBody} style={{ marginTop: 24 }}>{c.formIntro}</p>
              <dl className={d.contactList}>
                {details.map((x) => (
                  <div key={x.k}>
                    <dt>{x.k}</dt>
                    <dd>{x.href ? <a href={x.href}>{x.v}</a> : x.v}{x.note && <small>{x.note}</small>}</dd>
                  </div>
                ))}
              </dl>
            </div>
            <ContactForm services={services.map((x) => ({ title: x.title, slug: x.slug }))} />
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
