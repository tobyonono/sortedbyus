import Image from "next/image";
import type { Pic } from "@/lib/sanity/image";
import { picProps } from "@/components/ui/picProps";
import type { ReactNode } from "react";
import SiteHeader from "@/components/layout/SiteHeader";
import Reveal from "@/components/ui/Reveal";
import h from "@/styles/home.module.css";
import d from "@/styles/pages.module.css";

/** Inner-page hero: the homepage's espresso band and pointed colour block on a photo, shorter, no request card. */
export default function PageHero({ label, title, intro, image, focus, flip, children }: {
  /** mirror the photo, to put a subject on the left clear of the colour block */
  flip?: boolean;
  focus?: string; label: string; title: ReactNode; intro?: string; image: Pic; children?: ReactNode;
}) {
  return (
    <div className={h.top}>
      <SiteHeader />
      <section className={`${h.hero} ${d.hero}`} aria-labelledby="page-heading">
        <div className={h.heroGrow}>
          <Reveal className={h.heroPhoto} variant="hero">
            <span className={h.heroImg}><Image {...picProps(image)} alt={image.alt} fill loading="eager" fetchPriority="high" sizes="(min-width: 901px) 122vw, 100vw" style={{ objectPosition: focus ?? image.focus, scale: flip ? "-1 1" : undefined }} /></span>
            <div className={h.heroShade} />
            <div className={h.heroBlock} aria-hidden="true" />
            <div className={`${h.heroCopy} ${d.heroCopy}`}>
              <p className={d.heroLabel}>{label}</p>
              <h1 id="page-heading">{title}</h1>
              {intro && <p className={d.heroIntro}>{intro}</p>}
              {children}
            </div>
          </Reveal>
        </div>
      </section>
    </div>
  );
}
