import { pageMeta } from "@/lib/seo";
import { ButtonLink } from "@/components/Button";
import Accordion from "@/components/Accordion";
import PageHero from "../_ui/PageHero";
import SectionIntro from "../_ui/SectionIntro";
import Closing from "../_ui/Closing";
import Footer from "../_ui/Footer";
import FeatureTabs from "../_ui/FeatureTabs";
import Timeline from "../_ui/Timeline";
import h from "../../home.module.css";
import d from "../_ui/pages.module.css";

import { getCorporate } from "@/sanity/queries";
import { getSite } from "@/sanity/site";
import { must } from "@/sanity/image";
import { Lines } from "@/lib/text";

import type { Metadata } from "next";
export async function generateMetadata(): Promise<Metadata> {
  const c = await getCorporate();
  return pageMeta({ title: "Corporate services", description: c.seoDescription || c.heroIntro, path: "/corporate" });
}

/* "Ways to work with us" colour bands: lightest to darkest brown; the last (espresso) card takes light text. */
const MODEL_CUTS = ["#b89562", "#a5745b", "var(--espresso)"];

export default async function CorporatePage() {
  const [c, { wa }] = await Promise.all([getCorporate(), getSite()]);
  const corpCta = wa("Hi, I’d like to discuss a corporate solution.");
  return (
    <>
      <PageHero
        label="Corporate services"
        title={<Lines text={c.heroHeading} />}
        intro={c.heroIntro}
        image={must(c.heroImage)}
      >
        <ButtonLink href={corpCta} variant="outline-light" className={h.heroBtn}>{c.ctaLabel}</ButtonLink>
      </PageHero>
      <main>
        <section className={d.section} aria-labelledby="corp-offer">
          <SectionIntro id="corp-offer" label={c.offersLabel} title={c.offersHeading} intro={c.offersIntro} />
          <FeatureTabs items={c.offers.map((o) => ({ title: o.title, body: o.body, items: o.items, img: must(o.image, o.title), cta: { label: "Discuss this with us", href: corpCta } }))} />
        </section>

        <section className={`${d.section} ${d.dark}`} aria-labelledby="extras-heading">
          <SectionIntro id="extras-heading" label={c.peopleLabel} title={c.peopleHeading} sub />
          <Timeline items={c.people.map((p) => ({ title: p.title, body: p.body, img: must(p.image, p.title), ...(p.showButton ? { cta: { label: c.ctaLabel, href: corpCta } } : {}) }))} dark />
        </section>

        <section className={d.section} aria-labelledby="models-heading">
          <SectionIntro id="models-heading" label={c.modelsLabel} title={c.modelsHeading} intro={c.modelsIntro} />
          <ul className={d.cards}>
            {c.models.map((m, i) => (
              <li key={m.title} className={`${d.card} ${d.cutCard} ${i === MODEL_CUTS.length - 1 ? d.cutDark : ""}`} style={{ "--cut": MODEL_CUTS[i % MODEL_CUTS.length] } as React.CSSProperties}>
                <span className={d.cut} aria-hidden="true" />
                <h3 className={d.cardHeading}>{m.title}</h3>
                <p className={d.cardBody}>{m.body}</p>
                <span className={d.cardMeta}>{m.bestFor}</span>
              </li>
            ))}
          </ul>
          <div style={{ display: "flex", justifyContent: "center", marginTop: 48 }}>
            <ButtonLink href={corpCta} variant="primary" arrow>{c.ctaLabel}</ButtonLink>
          </div>
        </section>

        <section className={h.faq} aria-labelledby="faq-heading">
          <h2 id="faq-heading" className={`${h.h2} ${h.subHeading}`}>Good to know</h2>
          <Accordion items={c.faqs} defaultOpen={0} />
        </section>

        <Closing image={must(c.closingImage)} title={c.closingHeading} cta={c.ctaLabel} href={corpCta} />
      </main>
      <Footer />
    </>
  );
}
