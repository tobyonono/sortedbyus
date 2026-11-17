import { pageMeta } from "@/lib/seo";
import Image from "next/image";
import PageHero from "../_ui/PageHero";
import SectionIntro from "../_ui/SectionIntro";
import Closing from "../_ui/Closing";
import Footer from "../_ui/Footer";
import Ticks from "../_ui/Ticks";
import Principles from "../_ui/Principles";
import h from "../../home.module.css";
import d from "../_ui/pages.module.css";

import { getAbout } from "@/sanity/queries";
import { must } from "@/sanity/image";
import { picProps } from "@/components/picProps";
import { Lines } from "@/lib/text";

import type { Metadata } from "next";
export async function generateMetadata(): Promise<Metadata> {
  const c = await getAbout();
  return pageMeta({ title: "About us", description: c.seoDescription || c.heroIntro, path: "/about" });
}

export default async function AboutPage() {
  const c = await getAbout();
  const where = must(c.whereImage);
  return (
    <>
      <PageHero
        label="About us"
        title={<Lines text={c.heroHeading} />}
        intro={c.heroIntro}
        image={must(c.heroImage)}
      />
      <main>
        {/* Founder note: one narrow column, read like a letter, signed off at the foot */}
        <section className={d.section} aria-labelledby="story-heading">
          <div className={d.note}>
            <p className={h.label}>{c.storyLabel}</p>
            <h2 id="story-heading">{c.storyHeading}</h2>
            <div className={d.noteBody}>
              {c.story.map((para) => (
                <p key={para._key}>
                  {para.children.map((sp) =>
                    sp.marks?.includes("strong") ? <strong key={sp._key}>{sp.text}</strong> : sp.marks?.includes("em") ? <em key={sp._key}>{sp.text}</em> : <span key={sp._key}>{sp.text}</span>,
                  )}
                </p>
              ))}
            </div>
            <p className={d.noteSign}>
              <span>{c.storySignName || "[Founder’s name]"}</span>
              {c.storySignRole || "Founder"}, Sorted by Us
            </p>
          </div>
        </section>

        <section className={d.section} aria-labelledby="values-heading">
          <SectionIntro id="values-heading" label={c.valuesLabel} title={c.valuesHeading} sub />
          <Principles items={c.values.map((v) => ({ title: v.title, body: v.body }))} />
        </section>

        <section className={`${d.section} ${d.tinted}`} aria-labelledby="where-heading">
          <div className={d.row}>
            <div className={d.rowImg}><Image {...picProps(where)} alt={where.alt} fill sizes="(min-width: 900px) 50vw, 100vw" style={{ objectPosition: where.focus }} /></div>
            <div className={d.rowCopy}>
              <p className={d.eyebrow}>{c.whereLabel}</p>
              <h2 id="where-heading" className={d.rowHeading}>{c.whereHeading}</h2>
              <Ticks items={c.whereList} />
            </div>
          </div>
        </section>

        <Closing image={must(c.closingImage)} />
      </main>
      <Footer />
    </>
  );
}
