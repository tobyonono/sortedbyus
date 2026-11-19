"use client";

import Image from "next/image";
import type { Pic } from "@/lib/sanity/image";
import { picProps } from "@/components/ui/picProps";
import { useEffect, useRef } from "react";
import { ButtonLink } from "@/components/ui/Button";
import t from "./Timeline.module.css";

export type TimelineItem = { title: string; body: string; img: Pic; cta?: { label: string; href: string } };

/** Pillars on a centre line (dark: apricot line and type for an espresso band): copy and photo swap sides
    each row. A single dot rides the line, moving down as the timeline scrolls through the middle of the
    screen (it sits at the top before, the bottom after); it moves by transform, easing towards the scroll position. Without JS or with reduced motion it rests at the top. */
export default function Timeline({ items, dark }: { items: TimelineItem[]; dark?: boolean }) {
  const ref = useRef<HTMLOListElement>(null);
  const dot = useRef<HTMLLIElement>(null);

  useEffect(() => {
    const el = ref.current;
    const d = dot.current;
    if (!el || !d || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    // The dot is moved with a transform (no layout work), easing a little towards where the scroll
    // says it should be, so it glides instead of stepping with each scroll event.
    let raf = 0;
    let y = -1;
    const target = () => {
      const r = el.getBoundingClientRect();
      const p = Math.min(1, Math.max(0, (window.innerHeight / 2 - r.top) / r.height));
      return p * r.height;
    };
    const tick = () => {
      const t = target();
      y = y < 0 ? t : y + (t - y) * 0.2;
      if (Math.abs(t - y) < 0.3) y = t;
      d.style.transform = `translate3d(-50%, ${y.toFixed(2)}px, 0) translateY(-50%)`;
      raf = y === t ? 0 : requestAnimationFrame(tick);
    };
    const wake = () => { if (!raf) raf = requestAnimationFrame(tick); };
    tick();
    window.addEventListener("scroll", wake, { passive: true });
    window.addEventListener("resize", wake);
    return () => { window.removeEventListener("scroll", wake); window.removeEventListener("resize", wake); cancelAnimationFrame(raf); };
  }, []);

  return (
    <ol ref={ref} className={`${t.timeline} ${dark ? t.dark : ""}`}>
      <li ref={dot} className={t.dot} aria-hidden="true" />
      {items.map((it) => (
        <li key={it.title} className={t.item}>
          <div className={t.copy}>
            <h3 className={t.title}>{it.title}</h3>
            <p className={t.body}>{it.body}</p>
            {it.cta && <ButtonLink href={it.cta.href} variant={dark ? "outline-light" : "outline"} className={t.cta} arrow>{it.cta.label}</ButtonLink>}
          </div>
          <div className={t.media}>
            <Image {...picProps(it.img)} alt={it.img.alt} fill sizes="(min-width: 900px) 40vw, 100vw" style={{ objectPosition: it.img.focus }} />
          </div>
        </li>
      ))}
    </ol>
  );
}
