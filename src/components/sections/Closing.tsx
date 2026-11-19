import type { Pic } from "@/lib/sanity/image";
import CutBanner from "@/components/ui/CutBanner";
import { ButtonLink } from "@/components/ui/Button";
import Stagger from "@/components/ui/Stagger";
import h from "@/styles/home.module.css";

/** The closing banner, with its own line and CTA. When the page sets `words` (its short phrase in Sanity),
 *  they replace the title, set on staggered levels and coming in one at a time. */
export default function Closing({ image, title = "Consider it sorted.", words, levels, cta = "Make a request", href = "/contact", focus }: {
  image: Pic; title?: string; cta?: string; href?: string;
  /** the page's short phrase, shown staggered instead of the title */
  words?: string | null;
  /** level per word, e.g. "0,1,0,-1" (the default wave when empty) */
  levels?: string | null;
  /** object-position for the photo, e.g. "center 30%" */
  focus?: string;
}) {
  return (
    <CutBanner base={image} block={false} className={h.banner} aria-labelledby="closing-heading" style={focus ? { ["--base-pos" as string]: focus } : undefined}>
      <div className={h.bannerCopy}>
        <h2 id="closing-heading">
          {words?.trim() ? <Stagger text={words} levels={parseLevels(levels)} /> : title}
        </h2>
        <ButtonLink href={href} variant="primary" arrow>{cta}</ButtonLink>
      </div>
    </CutBanner>
  );
}

const parseLevels = (v?: string | null) => v?.split(",").map(Number).filter((n) => !Number.isNaN(n));
