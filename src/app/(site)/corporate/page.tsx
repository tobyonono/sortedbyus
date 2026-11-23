import { pageMeta } from "@/lib/seo";
import { earth } from "@/lib/palette";
import { ButtonLink } from "@/components/ui/Button";
import Accordion from "@/components/ui/Accordion";
import PageHero from "@/components/sections/PageHero";
import SectionIntro from "@/components/sections/SectionIntro";
import Closing from "@/components/sections/Closing";
import Footer from "@/components/layout/Footer";
import Principles from "@/components/sections/Principles";
import Timeline from "@/components/sections/Timeline";
import h from "@/styles/home.module.css";
import d from "@/styles/pages.module.css";

import { getCorporate } from "@/lib/sanity/queries";
import { getSite } from "@/lib/sanity/site";
import { must } from "@/lib/sanity/image";
import { Lines } from "@/lib/text";

import type { Metadata } from "next";
export async function generateMetadata(): Promise<Metadata> {
  const c = await getCorporate();
  return pageMeta({ title: "Corporate services", description: c.seoDescription || c.heroIntro, path: "/corporate" });
}


export default async function CorporatePage() {
  const [c, { wa }] = await Promise.all([getCorporate(), getSite()]);
  const corpCta = wa("Hi, I’d like to talk about support for my team.");
  return (
    <>
      <PageHero
        label="Corporate services"
        title={<Lines text={c.heroHeading} />}
        intro={c.heroIntro}
        image={must(c.heroImage)}
      >
        <ButtonLink href={corpCta} variant="outline-light" className={h.heroBtn} arrow>{c.ctaLabel}</ButtonLink>
      </PageHero>
      <main>
        <section className={d.section} aria-labelledby="corp-offer">
          <SectionIntro id="corp-offer" label={c.offersLabel} title={c.offersHeading} intro={c.offersIntro} />
          <Principles items={(c.offers ?? []).map((o) => ({ title: o.title, body: o.body }))} />
          <div style={{ display: "flex", justifyContent: "center", marginTop: 48 }}>
            <ButtonLink href={corpCta} variant="primary" arrow>{c.ctaLabel}</ButtonLink>
          </div>
        </section>

        <section className={`${d.section} ${d.dark}`} aria-labelledby="extras-heading">
          <SectionIntro id="extras-heading" label={c.peopleLabel} title={c.peopleHeading} sub />
          <Timeline items={(c.people ?? []).map((p) => ({ title: p.title, body: p.body, img: must(p.image, p.title), ...(p.showButton ? { cta: { label: c.ctaLabel, href: corpCta } } : {}) }))} dark />
        </section>

        <section className={d.section} aria-labelledby="models-heading">
          <SectionIntro id="models-heading" label={c.modelsLabel} title={c.modelsHeading} intro={c.modelsIntro} />
          <ul className={d.cards}>
            {(c.models ?? []).map((m, i) => (
              <li key={m.title} className={`${d.card} ${d.cutCard}`} style={{ "--cut": earth(i) } as React.CSSProperties}>
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
          <Accordion items={c.faqs ?? []} defaultOpen={0} />
        </section>

        <Closing image={must(c.closingImage)} title={c.closingHeading} words={c.breakText} levels={c.breakLevels} cta={c.ctaLabel} href={corpCta} />
      </main>
      <Footer />
    </>
  );
}
