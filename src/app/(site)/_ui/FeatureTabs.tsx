"use client";

import Image from "next/image";
import type { Pic } from "@/sanity/image";
import { picProps } from "@/components/picProps";
import { useEffect, useId, useState } from "react";
import { ButtonLink } from "@/components/Button";
import f from "./FeatureTabs.module.css";

export type Feature = { title: string; body: string; items?: string[]; facts?: [string, string][]; img: Pic; cta?: { label: string; href: string } };

const CYCLE = 7000; // ms each item stays open before the next one (Harvey-style auto-advance)

/**
 * Harvey-style feature list: titles stacked between hairlines; the open one shows its copy, and an olive
 * line fills along its top rule while it's open. The photo on the right follows the open item.
 * Auto-advances until someone picks an item (or always holds still with reduced motion).
 */
export default function FeatureTabs({ items }: { items: Feature[] }) {
  const uid = useId();
  const [open, setOpen] = useState(0);
  const [auto, setAuto] = useState(true);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (!auto || paused || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setTimeout(() => setOpen((o) => (o + 1) % items.length), CYCLE);
    return () => clearTimeout(t);
  }, [open, auto, paused, items.length]);

  return (
    <div className={f.wrap} data-auto={auto && !paused ? "" : undefined} style={{ ["--cycle" as string]: `${CYCLE}ms` }}>
      <ul className={f.list} onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
        {items.map((it, i) => {
          const isOpen = i === open;
          return (
            <li key={it.title} className={f.item} data-open={isOpen || undefined}>
              <span className={f.rule} aria-hidden="true">
                <span key={isOpen ? `on-${open}` : "off"} className={f.fill} />
              </span>
              <h3>
                <button
                  type="button"
                  className={f.title}
                  aria-expanded={isOpen}
                  aria-controls={`${uid}-${i}`}
                  onClick={() => { setOpen(i); setAuto(false); }}
                >
                  {it.title}
                </button>
              </h3>
              <div id={`${uid}-${i}`} className={f.panel} hidden={!isOpen}>
                <div className={f.mobileImg}>
                  <Image {...picProps(it.img)} alt="" fill sizes="100vw" style={{ objectPosition: it.img.focus }} />
                </div>
                <p className={f.body}>{it.body}</p>
                {it.facts && (
                  <dl className={f.facts}>
                    {it.facts.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}
                  </dl>
                )}
                {it.cta && (
                  <ButtonLink href={it.cta.href} className={f.link} arrow>{it.cta.label}</ButtonLink>
                )}
              </div>
            </li>
          );
        })}
      </ul>
      <div className={f.media}>
        {items.map((it, i) => (
          <div key={it.title} className={f.slide} data-open={i === open || undefined}>
            <Image {...picProps(it.img)} alt={it.img.alt} fill sizes="(min-width: 901px) 50vw, 100vw" style={{ objectPosition: it.img.focus }} />
          </div>
        ))}
      </div>
    </div>
  );
}
