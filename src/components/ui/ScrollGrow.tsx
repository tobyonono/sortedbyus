"use client";

import { prefersReducedMotion } from "@/lib/motion";
import { useEffect, useRef, type ReactNode } from "react";

/**
 * Exposes scroll progress as `--p` (0 → 1) on its element, from the top of the page until the
 * page has scrolled `distance` × viewport height. CSS uses it to grow the hero photo to full width.
 * Reduced motion: stays at 0.
 */
export default function ScrollGrow({
  className,
  distance = 0.5,
  children,
}: {
  className?: string;
  distance?: number;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || prefersReducedMotion()) return;
    let raf = 0;
    const update = () => {
      raf = 0;
      const p = Math.min(1, Math.max(0, window.scrollY / (window.innerHeight * distance)));
      el.style.setProperty("--p", p.toFixed(4));
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      cancelAnimationFrame(raf);
    };
  }, [distance]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
