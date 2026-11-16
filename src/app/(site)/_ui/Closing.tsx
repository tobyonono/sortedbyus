import type { Pic } from "@/sanity/image";
import CutBanner from "@/components/CutBanner";
import { ButtonLink } from "@/components/Button";
import h from "../../home.module.css";

/** The homepage's closing banner, with its own line and CTA. */
export default function Closing({ image, title = "Consider it sorted.", cta = "Make a request", href = "/contact", focus }: {
  image: Pic; title?: string; cta?: string; href?: string;
  /** object-position for the photo, e.g. "center 30%" */
  focus?: string;
}) {
  return (
    <CutBanner base={image} block={false} className={h.banner} aria-labelledby="closing-heading" style={focus ? { ["--base-pos" as string]: focus } : undefined}>
      <div className={h.bannerCopy}>
        <h2 id="closing-heading">{title}</h2>
        <ButtonLink href={href} variant="primary">{cta}</ButtonLink>
      </div>
    </CutBanner>
  );
}
