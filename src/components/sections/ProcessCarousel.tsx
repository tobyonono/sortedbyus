"use client";

import { prefersReducedMotion } from "@/lib/motion";
import Image from "next/image";
import type { Pic } from "@/lib/sanity/image";
import { picProps } from "@/components/ui/picProps";
import { useEffect, useEffectEvent, useLayoutEffect, useRef, useState } from "react";
import Reveal from "@/components/ui/Reveal";
import styles from "./ProcessCarousel.module.css";

export type ProcessStep = {
  title: string;
  body: string;
  image: Pic;
  /** object-position for the mobile landscape crop (e.g. "center 55%"); defaults to centre. */
  focus?: string;
};

type Rect = { x: number; y: number; w: number; h: number };

const pad = (n: number) => String(n).padStart(2, "0");
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const lerp = (a: Rect, b: Rect, t: number): Rect => ({
  x: a.x + (b.x - a.x) * t,
  y: a.y + (b.y - a.y) * t,
  w: a.w + (b.w - a.w) * t,
  h: a.h + (b.h - a.h) * t,
});

/** One clock for the whole slide change: images, divider, titles, body and counter all use these. Keep in sync with
 *  --slide-dur / --ease-reveal in ProcessCarousel.module.css. */
const DURATION = 900;
const EASE: [number, number, number, number] = [0.66, 0.01, 0.12, 0.98];

/** CSS cubic-bezier(x1, y1, x2, y2) evaluated at time t (0–1), solved for x by Newton + bisection. */
function cubicBezier([x1, y1, x2, y2]: [number, number, number, number]) {
  const bx = (u: number) => 3 * x1 * u * (1 - u) ** 2 + 3 * x2 * u ** 2 * (1 - u) + u ** 3;
  const by = (u: number) => 3 * y1 * u * (1 - u) ** 2 + 3 * y2 * u ** 2 * (1 - u) + u ** 3;
  const dx = (u: number) => 3 * x1 * (1 - u) ** 2 + 6 * (x2 - x1) * u * (1 - u) + 3 * (1 - x2) * u ** 2;
  return (t: number) => {
    if (t <= 0) return 0;
    if (t >= 1) return 1;
    let u = t;
    for (let i = 0; i < 6; i++) {
      const d = dx(u);
      if (Math.abs(d) < 1e-6) break;
      u -= (bx(u) - t) / d;
    }
    if (u < 0 || u > 1 || Math.abs(bx(u) - t) > 1e-4) {
      let lo = 0, hi = 1;
      u = t;
      for (let i = 0; i < 30; i++) {
        if (bx(u) < t) lo = u;
        else hi = u;
        u = (lo + hi) / 2;
      }
    }
    return by(u);
  };
}
const ease = cubicBezier(EASE);

/**
 * Thirdway-style process carousel, arrow driven.
 * One image per step, each an absolutely positioned box whose rect is interpolated by a fractional progress `p`:
 *  - current step:   large slot → 0×0 at the large slot's top-left (fades out late)
 *  - next step:      small slot → large slot
 *  - step after:     1px seed at the small slot's bottom-right → small slot (fades in late)
 * `p` tweens to the target step over DURATION on the same curve as the CSS text/counter transitions,
 * so everything starts and lands together. The divider fill tracks `p`.
 */
export default function ProcessCarousel({ heading, steps }: { heading: string; steps: ProcessStep[] }) {
  const n = steps.length;
  const [active, setActive] = useState(0);

  const stageRef = useRef<HTMLDivElement>(null);
  const largeSlotRef = useRef<HTMLDivElement>(null);
  const smallSlotRef = useRef<HTMLDivElement>(null);
  const fillRef = useRef<HTMLSpanElement>(null);
  const frameRefs = useRef<(HTMLDivElement | null)[]>([]);

  const rects = useRef<{ large: Rect; small: Rect; seed: Rect; exit: Rect } | null>(null);
  const progress = useRef(0); // rendered (eased) progress
  const raf = useRef(0);

  const measure = () => {
    const stage = stageRef.current?.getBoundingClientRect();
    const l = largeSlotRef.current?.getBoundingClientRect();
    const s = smallSlotRef.current?.getBoundingClientRect();
    if (!stage || !l || !s) return;
    const rel = (r: DOMRect): Rect => ({ x: r.x - stage.x, y: r.y - stage.y, w: r.width, h: r.height });
    const large = rel(l);
    const small = rel(s);
    rects.current = {
      large,
      small,
      seed: { x: small.x + small.w - 1, y: small.y + small.h - 1, w: 1, h: 1 },
      exit: { x: large.x, y: large.y, w: 0, h: 0 },
    };
  };

  const render = (p: number) => {
    const r = rects.current;
    if (!r) return;
    const t = Math.min(Math.floor(p), n - 1);
    const f = clamp01(p - t);
    const fadeOut = clamp01((f - 0.55) / 0.25);
    const fadeIn = clamp01((f - 0.8) / 0.2);

    frameRefs.current.forEach((el, i) => {
      if (!el) return;
      let rect: Rect;
      let alpha: number;
      if (i === t) {
        rect = lerp(r.large, r.exit, f);
        alpha = 1 - fadeOut;
      } else if (i === t + 1) {
        rect = lerp(r.small, r.large, f);
        alpha = 1;
      } else if (i === t + 2) {
        rect = lerp(r.seed, r.small, f);
        alpha = fadeIn;
      } else {
        rect = i < t ? r.exit : r.seed;
        alpha = 0;
      }
      el.style.transform = `translate3d(${rect.x}px, ${rect.y}px, 0)`;
      el.style.width = `${rect.w}px`;
      el.style.height = `${rect.h}px`;
      el.style.opacity = String(alpha);
      el.style.visibility = alpha > 0 ? "visible" : "hidden";
    });

    if (fillRef.current) fillRef.current.style.transform = `scaleY(${clamp01((p + 1) / n)})`;
  };

  // Initial measure + keep rects in sync with layout.
  const sync = useEffectEvent(() => {
    measure();
    render(progress.current);
  });
  useLayoutEffect(() => {
    sync();
    const stage = stageRef.current;
    if (!stage) return;
    const ro = new ResizeObserver(() => sync());
    ro.observe(stage);
    return () => ro.disconnect();
  }, []);

  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  const goTo = (i: number) => {
    const next = Math.max(0, Math.min(n - 1, i));
    setActive(next);

    if (prefersReducedMotion()) {
      progress.current = next;
      render(next);
      return;
    }

    cancelAnimationFrame(raf.current);
    const from = progress.current;
    if (from === next) return;
    // Start the clock on the first frame, the same frame React commits the new step and the CSS transitions begin.
    let start = -1;
    const tick = (now: number) => {
      if (start < 0) start = now;
      const k = clamp01((now - start) / DURATION);
      const p = from + (next - from) * ease(k);
      progress.current = p;
      render(p);
      if (k < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
  };

  const state = (i: number) => (i < active ? "past" : i === active ? "current" : "future");

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft") goTo(active - 1);
    if (e.key === "ArrowRight") goTo(active + 1);
  };

  return (
    <section className={styles.section} id="process" aria-labelledby="process-heading">
      {/* Desktop */}
      <div className={styles.desktop} aria-roledescription="carousel" onKeyDown={onKeyDown}>
        <h2 id="process-heading" className={styles.heading}>
          {heading}
        </h2>

        <div className={styles.slide} ref={stageRef}>
          {steps.map((s, i) => (
            <div
              key={i}
              ref={(el) => {
                frameRefs.current[i] = el;
              }}
              className={styles.frame}
              style={{ zIndex: i + 1 }}
              aria-hidden={i !== active}
            >
              <Image {...picProps(s.image)} alt={i === active ? s.image.alt : ""} fill sizes="(min-width: 1024px) 45vw, 100vw" style={{ objectPosition: s.image.focus }} />
            </div>
          ))}

          <div className={styles.largeSlot} ref={largeSlotRef} />
          <div className={styles.smallSlot} ref={smallSlotRef} />

          <div className={styles.copy}>
            <span className={styles.divider} aria-hidden="true">
              <span ref={fillRef} />
            </span>

            <p className={styles.counter} aria-live="polite" aria-label={`Step ${active + 1} of ${n}`}>
              <span className={styles.pill}>
                <span className={styles.roll} style={{ transform: `translateY(${-active * 1.5}em)` }}>
                  {steps.map((_, i) => (
                    <span key={i}>{pad(i + 1)}</span>
                  ))}
                </span>
              </span>
              <span aria-hidden="true">/</span>
              <span className={styles.pill}>{pad(n)}</span>
            </p>

            {steps.map((s, i) => (
              <div key={i} className={styles.text} data-state={state(i)} aria-hidden={i !== active}>
                <h3 className={styles.title}>
                  <span>{s.title}</span>
                </h3>
                <p className={styles.body}>{s.body}</p>
              </div>
            ))}

            <div className={styles.nav}>
              <button className={styles.navBtn} onClick={() => goTo(active - 1)} disabled={active === 0} aria-label="Previous step">
                <svg width="14" height="12" viewBox="0 0 8.67 7.35" aria-hidden="true">
                  <path d="M4.51 6.47L7.06 4.1L0 4.33V3.02L7.05 3.27L4.51 0.87L5.38 0L8.67 3.69L5.38 7.35L4.51 6.48V6.47Z" fill="currentColor" transform="translate(8.67 0) scale(-1 1)" />
                </svg>
              </button>
              <button className={styles.navBtn} onClick={() => goTo(active + 1)} disabled={active === n - 1} aria-label="Next step">
                <svg width="14" height="12" viewBox="0 0 8.67 7.35" aria-hidden="true">
                  <path d="M4.51 6.47L7.06 4.1L0 4.33V3.02L7.05 3.27L4.51 0.87L5.38 0L8.67 3.69L5.38 7.35L4.51 6.48V6.47Z" fill="currentColor" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile: stacked */}
      <div className={styles.stack}>
        <h2 className={styles.heading}>{heading}</h2>
        <ol>
          {steps.map((s, i) => (
            <li key={i}>
              <Reveal className={styles.stackImg}>
                <Image {...picProps(s.image)} alt={s.image.alt} fill sizes="100vw" style={{ objectPosition: s.focus ?? s.image.focus }} />
              </Reveal>
              <p className={styles.counter}>
                <span className={styles.pill}>{pad(i + 1)}</span>
                <span aria-hidden="true">/</span>
                <span className={styles.pill}>{pad(n)}</span>
              </p>
              <h3 className={styles.stackTitle}>{s.title}</h3>
              <p className={styles.stackBody}>{s.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
