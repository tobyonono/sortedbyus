import { pageMeta } from "@/lib/seo";
import { ButtonLink } from "@/components/ui/Button";
import Accordion from "@/components/ui/Accordion";
import PageHero from "@/components/sections/PageHero";
import SectionIntro from "@/components/sections/SectionIntro";
import Closing from "@/components/sections/Closing";
import Footer from "@/components/layout/Footer";
import FeatureTabs from "@/components/sections/FeatureTabs";
import MapBanner from "@/components/sections/MapBanner";
import h from "@/styles/home.module.css";
import d from "@/styles/pages.module.css";

import { getHowItWorks } from "@/lib/sanity/queries";
import { must } from "@/lib/sanity/image";
import { Lines } from "@/lib/text";

import type { Metadata } from "next";
export async function generateMetadata(): Promise<Metadata> {
  const c = await getHowItWorks();
  return pageMeta({ title: "How it works", description: c.seoDescription || c.heroIntro, path: "/how-it-works" });
}

/* Page structure: 1 promise · 2 the four steps · 3 behind the scenes · photo break · 4 costs and payment · 5 if something goes wrong
   · 6 FAQ · 7 close. Copy and photos come from Sanity (Pages → How it works). */

/* "If something goes wrong" card colour bands, in order. */
const WRONG_CUTS = ["#b89562", "var(--olive)", "var(--butter)", "#9e8f7f"];

export default async function HowItWorksPage() {
  const c = await getHowItWorks();
  const steps = (c.steps ?? []).map((st) => ({
    title: st.title,
    body: st.body,
    img: must(st.image, st.title),
  }));
  return (
    <>
      {/* 1. The promise */}
      <PageHero
        label="How it works"
        title={<Lines text={c.heroHeading} />}
        intro={c.heroIntro}
        image={must(c.heroImage)}
      >
        <div className={d.heroBtns}>
          <ButtonLink href="/contact" variant="primary" arrow>Make a request</ButtonLink>
        </div>
      </PageHero>
      <main>
        <section className={d.section} aria-labelledby="steps-heading">
          <SectionIntro id="steps-heading" label={c.stepsLabel} title={c.stepsHeading} intro={c.stepsIntro} />
          <FeatureTabs items={steps} />
        </section>

        <section aria-labelledby="network-heading">
          <MapBanner
            label={c.behindLabel}
            title={c.behindHeading}
            points={(c.behindPoints ?? []).map((p) => ({ t: p.title, b: p.body }))}
          />
        </section>

        <section className={`${d.section} ${d.tinted}`} aria-labelledby="pay-heading">
          <div className={d.twoCol}>
            <div>
              <p className={h.label} style={{ marginBottom: 16 }}>{c.costsLabel}</p>
              <h2 id="pay-heading">{c.costsHeading}</h2>
              <div style={{ marginTop: 32 }}><ButtonLink href="/contact" arrow>Make a request</ButtonLink></div>
            </div>
            <ul className={h.trustList} style={{ marginTop: 0 }}>
              {(c.costs ?? []).map((t) => <li key={t.title}><h3>{t.title}</h3><p>{t.body}</p></li>)}
            </ul>
          </div>
        </section>

        <section className={d.section} aria-labelledby="wrong-heading">
          <SectionIntro id="wrong-heading" label={c.wrongLabel} title={c.wrongHeading} intro={c.wrongIntro} sub />
          <ul className={`${d.cards} ${d.cards4}`}>
            {(c.wrong ?? []).map((w, i) => (
              <li key={w.title} className={`${d.card} ${d.cutCard}`} style={{ "--cut": WRONG_CUTS[i % WRONG_CUTS.length] } as React.CSSProperties}>
                <span className={d.cut} aria-hidden="true" />
                <h3 className={d.cardHeading}>{w.title}</h3>
                <p className={d.cardBody}>{w.body}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className={h.faq} aria-labelledby="faq-heading">
          <h2 id="faq-heading" className={`${h.h2} ${h.subHeading}`}>Good to know</h2>
          <Accordion items={c.faqs ?? []} defaultOpen={0} />
        </section>

        <Closing image={must(c.closingImage)} title={c.closingHeading} words={c.breakText} levels={c.breakLevels} />
      </main>
      <Footer />
    </>
  );
}
