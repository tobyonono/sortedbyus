import type { Metadata } from "next";
import Image from "next/image";
import { ButtonLink, Arrow } from "@/components/ui/Button";
import PageHero from "@/components/sections/PageHero";
import SectionIntro from "@/components/sections/SectionIntro";
import { getSite } from "@/lib/sanity/site";
import { must } from "@/lib/sanity/image";
import { picProps } from "@/components/ui/picProps";
import { Lines } from "@/lib/text";
import d from "@/styles/pages.module.css";

import binoculars from "@/assets/home/binoculars.jpg";
// last, as on the homepage, so its styles load after the banner's
import Footer from "@/components/layout/Footer";

export const metadata: Metadata = { title: "Page not found" };

/** On-brand 404: the inner-page hero, then the six services to carry on from. */
export default async function NotFound() {
  const { services } = await getSite();
  return (
    <>
      <PageHero
        label="404"
        title={<Lines text={"This page got\nstuck in traffic"} />}
        intro="We can’t find the page you were looking for."
        image={{ src: binoculars, alt: "A hiker looking out over a valley through a viewing telescope" }}
        flip
        focus="center 40%"
      >
        <div className={d.heroBtns}>
          <ButtonLink href="/" variant="primary" arrow>Back home</ButtonLink>
        </div>
      </PageHero>
      <main>
        <section className={d.section} aria-labelledby="services-heading">
          <SectionIntro id="services-heading" label="What we do" title="Or try one of these" sub />
          <ul className={`${d.others} ${d.others6}`}>
            {services.map((o) => (
              <li key={o.slug}>
                <a className={d.other} href={`/services/${o.slug}`}>
                  <span className={d.otherImg}><Image {...picProps(must(o.tileImage))} alt="" fill sizes="(min-width: 901px) 17vw, 50vw" style={{ objectPosition: must(o.tileImage).focus }} /></span>
                  <span className={d.otherTitle}>{o.title} <Arrow /></span>
                </a>
              </li>
            ))}
          </ul>
        </section>
      </main>
      <Footer />
    </>
  );
}
