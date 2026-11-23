import Image from "next/image";
import type { Pic } from "@/lib/sanity/image";
import { picProps } from "@/components/ui/picProps";
import { earth } from "@/lib/palette";
import s from "./StepCards.module.css";

/**
 * A process as a checkerboard of text cards and photos (Primer "approach" pattern): each step is a text card
 * paired with its photo, one step per row, placed in different columns so the rows sit off-balance.
 * A step can carry an extra, decorative photo (desktop only) to fill an empty cell. Text cards take the site's card colours in the usual order (palette.ts). `body` may hold several paragraphs, separated by a blank line.
 */
export default function StepCards({ items }: { items: { title: string; body: string; img: Pic; extra?: Pic }[] }) {
  return (
    <ol className={s.grid}>
      {items.map((it, i) => (
        <li key={it.title} className={s.step}>
          <div className={s.card} style={{ "--tone": earth(i) } as React.CSSProperties}>
            <p className={s.num} aria-hidden="true">{String(i + 1).padStart(2, "0")}</p>
            <h3 className={s.title}>{it.title}</h3>
            <div className={s.body}>
              {it.body.split(/\n\s*\n/).map((para, j) => <p key={j}>{para.trim()}</p>)}
            </div>
          </div>
          <div className={s.photo}>
            <Image {...picProps(it.img)} alt={it.img.alt} fill sizes="(min-width: 1181px) 25vw, (min-width: 701px) 50vw, 100vw" style={{ objectPosition: it.img.focus }} />
          </div>
          {it.extra && (
            <div className={`${s.photo} ${s.extra}`} aria-hidden="true">
              <Image {...picProps(it.extra)} alt="" fill sizes="25vw" style={{ objectPosition: it.extra.focus }} />
            </div>
          )}
        </li>
      ))}
    </ol>
  );
}
