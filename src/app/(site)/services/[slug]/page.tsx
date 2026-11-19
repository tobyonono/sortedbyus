import { pageMeta } from "@/lib/seo";
import JsonLd, { business } from "@/components/layout/JsonLd";
import { site } from "@/lib/site";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { earth } from "@/lib/palette";
import { notFound } from "next/navigation";
import { ButtonLink, Arrow } from "@/components/ui/Button";
import Accordion from "@/components/ui/Accordion";
import RequestTicker from "@/components/sections/RequestTicker";
import { tickerItems } from "@/components/sections/tickerItems";
import { picProps } from "@/components/ui/picProps";
import { getService, getServiceSlugs } from "@/lib/sanity/queries";
import { getSite } from "@/lib/sanity/site";
import { must } from "@/lib/sanity/image";
import PageHero from "@/components/sections/PageHero";
import SectionIntro from "@/components/sections/SectionIntro";
import Closing from "@/components/sections/Closing";
import Footer from "@/components/layout/Footer";
import h from "@/styles/home.module.css";
import d from "@/styles/pages.module.css";

export async function generateStaticParams() {
  return (await getServiceSlugs()).map((slug) => ({ slug }));
}
// only the services that exist in Sanity at build time; anything else is a 404
export const dynamicParams = false;

export async function generateMetadata({ params }: PageProps<"/services/[slug]">): Promise<Metadata> {
  const s = await getService((await params).slug);
  return s ? pageMeta({ title: s.title, description: s.seoDescription || s.intro, path: `/services/${s.slug}` }) : {};
}

export default async function ServicePage({ params }: PageProps<"/services/[slug]">) {
  const { slug } = await params;
  const [s, { services }] = await Promise.all([getService(slug), getSite()]);
  if (!s) notFound();
  const others = services.filter((o) => o.slug !== s.slug);
  const side = must(s.sideImage);
  // the default bottom banner is the Gifts photo of a flower-laid table; a service can set its own
  const closing = s.closingImage?.asset ? must(s.closingImage) : must(services.find((x) => x.slug === "gifts-celebrations")?.heroImage);

  return (
    <>
      <PageHero label={s.title} title={s.heroHeading} intro={s.intro} image={must(s.heroImage)}>
        <ButtonLink href="/contact" variant="primary" arrow>Request {s.short}</ButtonLink>
      </PageHero>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Service",
          name: s.title,
          serviceType: s.title,
          description: s.intro,
          url: `${site.url}/services/${s.slug}`,
          provider: { "@id": business["@id"] },
          areaServed: business.areaServed,
          hasOfferCatalog: {
            "@type": "OfferCatalog",
            name: s.title,
            itemListElement: (s.offers ?? []).map((o) => ({ "@type": "Offer", itemOffered: { "@type": "Service", name: o.title, description: o.body } })),
          },
        }}
      />
      <main>
        <section className={d.section} aria-labelledby="offer-heading">
          <SectionIntro id="offer-heading" label="What we can sort" title={`${s.title}, handled`} intro="A few of the things we’re asked for most. If yours isn’t here, ask anyway." />
          <ul className={d.cards}>
            {(s.offers ?? []).map((o, i) => (
              <li key={o.title}>
                <Link
                  href={`/contact?service=${s.slug}&item=${encodeURIComponent(o.title)}`}
                  className={`${d.card} ${d.cutCard} ${d.offerCard}`}
                  style={{ minHeight: 320, height: "100%", "--cut": earth(i), "--cta": "var(--espresso)" } as React.CSSProperties}
                >
                  <span className={`${d.cut} ${d.saw}`} aria-hidden="true" />
                  <h3 className={d.cardHeading}>{o.title}</h3>
                  <p className={d.cardBody}>{o.body}</p>
                  <span className={d.offerCta} aria-hidden="true">Make a request <Arrow /></span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section className={h.examples} style={{ paddingTop: 0 }} aria-labelledby="asks-heading">
          <div className={h.examplesHead}>
            <p className={h.label}>Just ask</p>
            <h2 id="asks-heading" className={`${h.splitHeading} ${h.subHeading}`}>Things people ask us for</h2>
          </div>
          <RequestTicker items={tickerItems(s.examples, ["butter", "espresso", "olive", "muted"])} />
        </section>

        <section className={`${d.section} ${d.tinted}`} aria-labelledby="how-heading">
          <div className={d.row}>
            <div className={d.rowImg}><Image {...picProps(side)} alt={side.alt} fill sizes="(min-width: 900px) 50vw, 100vw" style={{ objectPosition: side.focus }} /></div>
            <div className={d.rowCopy}>
              <p className={d.eyebrow}>How it works</p>
              <h2 id="how-heading" className={d.rowHeading}>One request, one clear quote</h2>
              <div>
                <p className={d.rowBody}>
                  Tell us what you need on the website or WhatsApp; photos and links help. We find the right option, often with a few to
                  choose from, and send you one clear quote with our fee included.
                </p>
                <p className={d.rowBody} style={{ marginTop: 16 }}>
                  Once you’ve approved it and paid by transfer, we arrange everything and keep you posted on WhatsApp until it’s done.
                </p>
              </div>
              <ButtonLink href="/how-it-works" arrow>More on how it works</ButtonLink>
            </div>
          </div>
        </section>

        <section className={`${h.faq} ${h.faqSpaced}`} aria-labelledby="faq-heading">
          <h2 id="faq-heading" className={`${h.h2} ${h.subHeading}`}>Good to know</h2>
          <Accordion items={s.faqs ?? []} defaultOpen={0} />
        </section>

        <section className={`${d.section} ${d.tinted} ${d.taupe}`} aria-labelledby="more-heading">
          <SectionIntro id="more-heading" label="Our services" title="More we can sort" sub />
          <ul className={d.others}>
            {others.map((o) => (
              <li key={o.slug}>
                <a className={d.other} href={`/services/${o.slug}`}>
                  <span className={d.otherImg}><Image {...picProps(must(o.tileImage))} alt="" fill sizes="20vw" style={{ objectPosition: must(o.tileImage).focus }} /></span>
                  <span className={d.otherTitle}>{o.title} <Arrow /></span>
                </a>
              </li>
            ))}
          </ul>
        </section>

        <Closing image={closing} title="Tell us what you need." words={s.breakText} levels={s.breakLevels} cta={`Request ${s.short}`} />
      </main>
      <Footer />
    </>
  );
}
