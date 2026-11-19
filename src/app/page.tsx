import Image from "next/image";
import Link from "next/link";
import RequestCard from "@/components/sections/RequestCard";
import RequestPanel from "@/components/sections/RequestPanel";
import { ButtonLink, Arrow } from "@/components/ui/Button";
import ProcessCarousel, { type ProcessStep } from "@/components/sections/ProcessCarousel";
import RequestTicker from "@/components/sections/RequestTicker";
import Accordion from "@/components/ui/Accordion";
import Reveal from "@/components/ui/Reveal";
import Stagger, { parseLevels } from "@/components/ui/Stagger";
import ScrollGrow from "@/components/ui/ScrollGrow";
import CutBanner from "@/components/ui/CutBanner";
import SiteHeader from "@/components/layout/SiteHeader";
import { getHome } from "@/lib/sanity/queries";
import { getSite } from "@/lib/sanity/site";
import { must } from "@/lib/sanity/image";
import { picProps } from "@/components/ui/picProps";
import { tickerItems } from "@/components/sections/tickerItems";
import { Lines } from "@/lib/text";
import s from "@/styles/home.module.css";
import type { Metadata } from "next";
import { pageMeta } from "@/lib/seo";
import JsonLd, { business } from "@/components/layout/JsonLd";

export async function generateMetadata(): Promise<Metadata> {
  const [c, { settings }] = await Promise.all([getHome(), getSite()]);
  return pageMeta({ description: c.seoDescription || settings.description, path: "/" });
}

// after the other imports, so home.module.css still loads after CutBanner.module.css (its overrides win)
import Footer from "@/components/layout/Footer";

// About + "Why trust us" section is hidden for now; flip to true to bring it (and its nav/footer links) back.
const SHOW_ABOUT = false;

const trust = [
  { title: "A clear quote, up front", body: "You see the full cost, including our fee, before anything goes ahead." },
  { title: "You approve before you pay", body: "Nothing is bought or booked until you’ve said yes to the quote." },
  { title: "Invoiced, paid by transfer", body: "We send an invoice and you pay by bank transfer. We never ask for card details on the website." },
  { title: "Updates until it’s closed", body: "We keep you posted on WhatsApp until it’s delivered, done and closed." },
];

export default async function Home() {
  const [c, { services, wa }] = await Promise.all([getHome(), getSite()]);
  const steps: ProcessStep[] = (c.processSteps ?? []).map((st) => ({ title: st.title, body: st.body, image: must(st.image, st.title) }));
  return (
    <>
      {/* ---------- Top band + hero ---------- */}
      <div className={s.top}>
        <SiteHeader />
        <section className={s.hero} aria-labelledby="hero-heading">
          {/* Photo grows from inset to full width as the page scrolls (--p from ScrollGrow) */}
          <ScrollGrow className={s.heroGrow}>
            <Reveal className={s.heroPhoto} variant="hero">
              <span className={s.heroImg}>
                <Image
                  {...picProps(must(c.heroImage))}
                  alt={must(c.heroImage).alt}
                  style={{ objectPosition: must(c.heroImage).focus }}
                  fill
                  loading="eager"
                  fetchPriority="high"
                  // drawn 122% wide on desktop (see .heroImg), so request a file that wide
                  sizes="(min-width: 901px) 122vw, 100vw"
                />
              </span>
              <div className={s.heroShade} />
              {/* Colour block: two mirrored cuts meeting in a point on the right, holding the copy */}
              <div className={s.heroBlock} aria-hidden="true" />
              <div className={s.heroCopy}>
                <div>
                  <h1 id="hero-heading">
                    <Lines text={c.heroHeading} />
                  </h1>
                  {c.heroSubline && <p className={s.heroSub}>{c.heroSubline}</p>}
                </div>
                <ButtonLink href="#offer" variant="outline-light" arrow className={s.heroBtn}>
                  {c.heroButton}
                </ButtonLink>
              </div>
            </Reveal>
          </ScrollGrow>
          <div className={s.heroCard}>
            <RequestCard id="request" title="What can we sort?" services={[...services.map((x) => x.title), "Corporate", "Something else"]} />
          </div>
        </section>
      </div>

      <JsonLd data={business} />
      <main>
        {/* ---------- What we offer ---------- */}
        <section className={s.offer} id="offer" aria-labelledby="offer-heading">
          <Reveal className={s.introGroup} variant="cut" threshold={0.3}>
            <p className={s.labelCenter}>{c.offerLabel}</p>
            <h2 id="offer-heading" className={s.h2}>
              {c.offerHeading}
            </h2>
            <p className={s.intro}>{c.offerIntro}</p>
          </Reveal>
          <ul className={s.grid}>
            {services.map((o) => (
              <li key={o.slug}>
                <Link className={s.tile} href={`/services/${o.slug}`}>
                  <Reveal as="span" className={s.tileImg}>
                    <Image {...picProps(must(o.tileImage))} alt={must(o.tileImage).alt} style={{ objectPosition: must(o.tileImage).focus }} fill sizes="(min-width: 900px) 50vw, 100vw" />
                  </Reveal>
                  <span className={s.tileBody}>
                    <span className={s.tileTitle}>{o.title}</span>
                    <span className={s.tileEg}>{o.tileSummary}</span>
                    <span className={s.tileBtn}>
                      Explore <Arrow />
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        {/* ---------- Something else (catch-all for the categories) ---------- */}
        <section className={s.catchall} aria-labelledby="else-heading">
          <CutBanner as="div" base={must(c.catchallImage)} tone="var(--olive)" mirror align="start" className={s.catchallInner}>
            <div className={s.catchallCopy}>
              <div>
                <p className={s.label}>{c.catchallLabel}</p>
                <h2 id="else-heading" className={`${s.panelHeading} ${s.subHeading}`}>
                  {c.catchallHeading}
                </h2>
              </div>
              <div className={s.catchallSide}>
                <p className={s.catchallBody}>{c.catchallBody}</p>
                <ButtonLink href="#request" data-service="Something else" className={s.oliveBtn} arrow>
                  {c.catchallButton}
                </ButtonLink>
              </div>
            </div>
          </CutBanner>
        </section>

        {/* ---------- Example requests ticker ---------- */}
        <section className={s.examples} aria-labelledby="examples-heading">
          <div className={s.examplesHead}>
            <p className={s.label}>{c.examplesLabel}</p>
            <h2 id="examples-heading" className={`${s.splitHeading} ${s.subHeading}`}>
              {c.examplesHeading}
            </h2>
          </div>
          <RequestTicker items={tickerItems(c.examples, ["apricot", "butter", "espresso", "olive", "muted"])} />
        </section>

        {/* ---------- Process (Thirdway carousel) ---------- */}
        <ProcessCarousel heading={c.processHeading} steps={steps} />

        {/* ---------- Who we help: section intro, then individuals, families and corporate as its items ---------- */}
        <section className={s.who} aria-labelledby="who-heading">
          <Reveal className={`${s.whoHead} ${s.introGroup}`} variant="cut" threshold={0.3}>
            <p className={s.labelCenter}>{c.whoLabel}</p>
            <h2 id="who-heading" className={s.h2}>
              {c.whoHeading}
            </h2>
            <p className={s.intro}>{c.whoIntro}</p>
          </Reveal>

          {/* Audience splits: full-bleed image left, sticky copy right (IIT ID-style) */}
          <div className={s.audiences}>
            {(c.audiences ?? []).map((au, i) => (
              <section key={au.label} className={s.split} aria-labelledby={`aud-${i}`}>
                <Reveal className={s.splitImg}>
                  <Image {...picProps(must(au.image))} alt={must(au.image).alt} style={{ objectPosition: must(au.image).focus }} fill sizes="(min-width: 900px) 50vw, 100vw" />
                </Reveal>
                <div className={s.splitSide}>
                  <div className={s.splitCopy}>
                    <p className={s.label}>{au.label}</p>
                    <h3 id={`aud-${i}`} className={`${s.splitHeading} ${s.subHeading}`}>
                      {au.heading}
                    </h3>
                    <p className={s.splitBody}>{au.body}</p>
                    <div>
                      <ButtonLink href="#request" arrow>
                        {au.button}
                      </ButtonLink>
                    </div>
                  </div>
                </div>
              </section>
            ))}
          </div>

          {/* Corporate */}
          <section className={s.corporate} id="corporate" aria-labelledby="corp-heading">
            <CutBanner as="div" base={must(c.corpImage)} tone="var(--muted)" align="end" className={s.corpInner}>
              <div className={s.corpCopy}>
                <p className={s.corpLabel}>{c.corpLabel}</p>
                <h3 id="corp-heading" className={`${s.corpHeading} ${s.subHeading}`}>
                  <Lines text={c.corpHeading} />
                </h3>
                <p className={s.corpBody}>{c.corpBody}</p>
                <ButtonLink
                  href={wa("Hi, I’d like to discuss a corporate solution.")}
                  variant="outline-light"
                  className={s.corpBtn}
                  arrow
                >
                  {c.corpButton}
                </ButtonLink>
              </div>
            </CutBanner>
          </section>
        </section>

        {/* ---------- About + why trust us (hidden for now) ---------- */}
        {SHOW_ABOUT && (
          <section className={s.trust} id="about" aria-labelledby="trust-heading">
            <Reveal className={`${s.panel} ${s.panelApricot}`} variant="fade">
              <p className={s.label}>About us</p>
              <h2 className={s.panelHeading}>
                Who is
                <br />
                Sorted by Us?
              </h2>
              <p className={s.panelBody}>
                A Nigerian personal concierge and solutions company for individuals, families and businesses. Resourceful, honest and
                transparent — whatever you need, we’ll find a way.
              </p>
            </Reveal>
            <div className={s.trustCopy}>
              <p className={s.label}>Why trust us</p>
              <h2 id="trust-heading" className={s.splitHeading}>
                Straightforward, start to finish
              </h2>
              <ul className={s.trustList}>
                {trust.map((t) => (
                  <li key={t.title}>
                    <h3>{t.title}</h3>
                    <p>{t.body}</p>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}

        {/* ---------- FAQ ---------- */}
        <section className={s.faq} id="faq" aria-labelledby="faq-heading">
          <h2 id="faq-heading" className={`${s.h2} ${s.subHeading}`}>
            {c.faqHeading}
          </h2>
          <Accordion items={c.faqs ?? []} defaultOpen={0} />
        </section>

        {/* ---------- Closing banner: photo + angled photo cut + colour block (Narai-style) ---------- */}
        <CutBanner base={must(c.closingImage)} block={false} className={s.banner} aria-labelledby="banner-heading">
          <div className={s.bannerCopy}>
            <h2 id="banner-heading"><Stagger text={c.closingHeading} levels={parseLevels(c.closingLevels)} /></h2>
            <ButtonLink href="#request" variant="primary" arrow>
              {c.closingButton}
            </ButtonLink>
          </div>
        </CutBanner>
      </main>

      <RequestPanel services={[...services.map((x) => x.title), "Corporate", "Something else"]} />

      {/* ---------- Footer (shared with the inner pages) ---------- */}
      <Footer />
    </>
  );
}
