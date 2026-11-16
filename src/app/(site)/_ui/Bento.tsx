import Image, { type StaticImageData } from "next/image";
import Link from "next/link";
import { Arrow } from "@/components/Button";
import b from "./Bento.module.css";

export type BentoItem = { title: string; body: string; img: StaticImageData; alt: string; href: string };

/** Harvey-style bento of the services: one tall card, two small, then wide cards. Each photo is cut on a
    rising diagonal by the card's own colour, the brand cut (the photo is the need, the block is where it's sorted). */
export default function Bento({ items }: { items: BentoItem[] }) {
  const shape = [b.tall, "", "", b.wide, "", b.wide];
  return (
    <ul className={b.grid}>
      {items.map((it, i) => (
        <li key={it.title} className={`${b.card} ${shape[i] ?? ""}`}>
          <Link href={it.href} className={b.link}>
            <div className={b.copy}>
              <h3 className={b.title}>{it.title}</h3>
              <p className={b.body}>{it.body}</p>
              <span className={b.more}>Explore <Arrow /></span>
            </div>
            <div className={b.photo}>
              <Image src={it.img} alt={it.alt} fill sizes="(min-width: 900px) 40vw, 100vw" placeholder="blur" />
              <span className={b.cut} aria-hidden="true" />
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
