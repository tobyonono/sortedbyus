import Image from "next/image";
import { pic, type SanityImg } from "@/lib/sanity/image";
import { picProps } from "@/components/ui/picProps";
import Stagger from "@/components/ui/Stagger";
import Reveal from "@/components/ui/Reveal";
import styles from "./PhotoBreak.module.css";

/** A pause between sections: an edge-to-edge photo just under the height of the screen, with a few
 *  staggered words centred on it. Renders nothing unless both the words and the photo are set in Sanity. */
export default function PhotoBreak({ text, image, levels }: { text?: string; image?: SanityImg; levels?: string }) {
  const p = pic(image);
  if (!text?.trim() || !p) return null;
  return (
    <Reveal as="section" variant="cut" threshold={0.25} className={styles.break} aria-label={text}>
      <Image {...picProps(p)} alt={p.alt} fill sizes="100vw" style={p.focus ? { objectPosition: p.focus } : undefined} />
      <p className={styles.words}><Stagger text={text} levels={levels?.split(",").map(Number).filter((n) => !Number.isNaN(n))} /></p>
    </Reveal>
  );
}
