import { pageMeta } from "@/lib/seo";
import { ButtonLink } from "@/components/Button";
import Accordion from "@/components/Accordion";
import PageHero from "../_ui/PageHero";
import SectionIntro from "../_ui/SectionIntro";
import Closing from "../_ui/Closing";
import Footer from "../_ui/Footer";
import FeatureTabs from "../_ui/FeatureTabs";
import MapBanner from "../_ui/MapBanner";
import h from "../../home.module.css";
import d from "../_ui/pages.module.css";

import { getHowItWorks } from "@/sanity/queries";
import { getSite } from "@/sanity/site";
import { must } from "@/sanity/image";
import { Lines } from "@/lib/text";

import type { Metadata } from "next";
export async function generateMetadata(): Promise<Metadata> {
  const c = await getHowItWorks();
  return pageMeta({ title: "How it works", description: c.seoDescription || c.heroIntro, path: "/how-it-works" });
}

/* Page structure: 1 promise · 2 the four steps · 3 behind the scenes · 4 costs and payment · 5 if something goes wrong
   · 6 FAQ · 7 close. Copy and photos come from Sanity (Pages → How it works). */

/* "If something goes wrong" card colour bands, in order. */
const WRONG_CUTS = ["#b89562", "var(--olive)", "var(--butter)", "#9e8f7f"];

export default async function HowItWorksPage() {
  const [c, { wa }] = await Promise.all([getHowItWorks(), getSite()]);
  const waHref = wa("Hi, I’d like to get something sorted.");
  const steps = c.steps.map((st) => ({
    title: st.title,
    body: st.summary,
    facts: [["You", st.you], ["We", st.we], ["Timing", st.timing]] as [string, string][],
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
          <ButtonLink href={waHref} variant="outline-light" className={h.heroBtn} arrow>WhatsApp us</ButtonLink>
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
            points={c.behindPoints.map((p) => ({ t: p.title, b: p.body }))}
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
              {c.costs.map((t) => <li key={t.title}><h3>{t.title}</h3><p>{t.body}</p></li>)}
            </ul>
          </div>
        </section>

        <section className={d.section} aria-labelledby="wrong-heading">
          <SectionIntro id="wrong-heading" label={c.wrongLabel} title={c.wrongHeading} intro={c.wrongIntro} sub />
          <ul className={`${d.cards} ${d.cards4}`}>
            {c.wrong.map((w, i) => (
              <li key={w.title} className={`${d.card} ${d.cutCard}`} style={{ minHeight: 400, "--cut": WRONG_CUTS[i % WRONG_CUTS.length] } as React.CSSProperties}>
                <span className={d.cut} aria-hidden="true" />
                <h3 className={d.cardHeading}>{w.title}</h3>
                <p className={d.cardBody}>{w.body}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className={h.faq} aria-labelledby="faq-heading">
          <h2 id="faq-heading" className={`${h.h2} ${h.subHeading}`}>Good to know</h2>
          <Accordion items={c.faqs} defaultOpen={0} />
        </section>

        <Closing image={must(c.closingImage)} title={c.closingHeading} />
      </main>
      <Footer />
    </>
  );
}
