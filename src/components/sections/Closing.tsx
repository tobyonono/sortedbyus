import type { Pic } from "@/lib/sanity/image";
import CutBanner from "@/components/ui/CutBanner";
import { ButtonLink } from "@/components/ui/Button";
import Stagger, { parseLevels } from "@/components/ui/Stagger";
import h from "@/styles/home.module.css";

/** The closing banner, with its own line and CTA. When the page sets `words` (its short phrase in Sanity),
 *  they replace the title. Only when it also sets `levels` do the words sit on staggered levels and come in
 *  one at a time: kept for the odd phrase that earns it, so the effect stays special. */
export default function Closing({ image, title = "Consider it sorted.", words, levels, cta = "Make a request", href = "/contact", focus }: {
  image: Pic; title?: string; cta?: string; href?: string;
  /** the page's short phrase, shown staggered instead of the title */
  words?: string | null;
  /** level per word, e.g. "0,1,0,-1"; empty = a plain heading */
  levels?: string | null;
  /** object-position for the photo, e.g. "center 30%" */
  focus?: string;
}) {
  return (
    <CutBanner base={image} block={false} className={h.banner} aria-labelledby="closing-heading" style={focus ? { ["--base-pos" as string]: focus } : undefined}>
      <div className={h.bannerCopy}>
        <h2 id="closing-heading">
          {words?.trim() ? (levels?.trim() ? <Stagger text={words} levels={parseLevels(levels)} /> : words) : title}
        </h2>
        <ButtonLink href={href} variant="primary" arrow>{cta}</ButtonLink>
      </div>
    </CutBanner>
  );
}
