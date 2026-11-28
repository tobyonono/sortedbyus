"use client";

import Image from "next/image";
import type { Pic } from "@/lib/sanity/image";
import { picProps } from "@/components/ui/picProps";
import { useEffect, useRef } from "react";
import styles from "./RequestTicker.module.css";

export type TickerItem = {
  label: string;
  text: string;
  /** Photo card when set, otherwise a solid colour card. */
  img?: Pic;
  /** object-position for the photo (default centre). */
  pos?: string;
  /** Plain-card colour: the brand and earth colours (butter stays for things you can press). */
  tone?: "apricot" | "butter" | "espresso" | "olive" | "muted" | "caramel" | "terracotta" | "taupe";
  /** Relative width (1 = base card width). */
  w: number;
  /** Card height in px at desktop size (scaled down on small screens). */
  h: number;
  /** Vertical offset in px from the top of the track. */
  y: number;
};

/**
 * Infinite, full-bleed ticker of example request cards (staggered heights, offsets and colours).
 * Pure CSS marquee: the list is rendered twice and the track slides by exactly one copy.
 * Hover/focus eases it down to SLOW speed (never a full stop); with reduced motion it becomes a static,
 * swipeable row.
 */
const SLOW = 0.25;
const EASE_MS = 500;
export default function RequestTicker({ items }: { items: TickerItem[] }) {
  const tickerRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLUListElement>(null);

  // Ease the CSS animation's playbackRate on hover/focus. Changing the rate keeps the current position,
  // so there's no jump (changing animation-duration would).
  useEffect(() => {
    const ticker = tickerRef.current;
    const track = trackRef.current;
    if (!ticker || !track) return;
    let raf = 0;
    let rate = 1;
    const to = (target: number) => {
      const anim = track.getAnimations()[0];
      if (!anim) return;
      cancelAnimationFrame(raf);
      const from = rate;
      const start = performance.now();
      const step = (now: number) => {
        const k = Math.min(1, (now - start) / EASE_MS);
        rate = from + (target - from) * (1 - (1 - k) ** 3); // ease-out cubic
        anim.playbackRate = rate;
        if (k < 1) raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
    };
    const slow = () => to(SLOW);
    const resume = () => {
      if (!ticker.matches(":hover, :focus-within")) to(1);
    };
    ticker.addEventListener("pointerenter", slow);
    ticker.addEventListener("pointerleave", resume);
    ticker.addEventListener("focusin", slow);
    ticker.addEventListener("focusout", resume);
    return () => {
      cancelAnimationFrame(raf);
      ticker.removeEventListener("pointerenter", slow);
      ticker.removeEventListener("pointerleave", resume);
      ticker.removeEventListener("focusin", slow);
      ticker.removeEventListener("focusout", resume);
    };
  }, []);

  const renderList = (copy: number) =>
    items.map((it, i) => (
      <li
        key={`${copy}-${i}`}
        className={styles.item}
        style={{ ["--w" as string]: it.w, ["--h" as string]: it.h, ["--y" as string]: it.y }}
        aria-hidden={copy === 1 || undefined}
      >
        <p className={styles.label}>{it.label}</p>
        {it.img ? (
          <div className={`${styles.card} ${styles.photo}`}>
            <Image {...picProps(it.img)} alt="" fill sizes="320px" style={{ objectPosition: it.pos ?? it.img.focus }} />
            <p className={styles.caption}>{it.text}</p>
          </div>
        ) : (
          <div className={styles.card} data-tone={it.tone ?? "apricot"}>
            <p className={styles.quote}>{it.text}</p>
          </div>
        )}
      </li>
    ));

  return (
    <div ref={tickerRef} className={styles.ticker} role="region" aria-label="Examples of requests">
      <ul ref={trackRef} className={styles.track} style={{ ["--n" as string]: items.length }}>
        {renderList(0)}
        {renderList(1)}
      </ul>
    </div>
  );
}
