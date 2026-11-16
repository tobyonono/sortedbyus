"use client";

import { useEffect, useLayoutEffect, useRef, useState, type ElementType, type ComponentPropsWithoutRef } from "react";

type Props<T extends ElementType> = {
  as?: T;
  /** "zoom" = Røros lazyzoom on the child image; "fade" = Røros lazyloaded fade on the element;
   *  "cut" = no global styles, just the in-view trigger (component CSS keys off [data-in]);
   *  "hero" = the page's main photo: visible from the first paint (it is the LCP image), settling in with
   *  a CSS-only motion, and only hidden when a client-side navigation lands before its file has arrived. */
  variant?: "zoom" | "fade" | "cut" | "hero";
  /** Share of the element that must be visible before it reveals (default 0.05). */
  threshold?: number;
} & Omit<ComponentPropsWithoutRef<T>, "as">;

/** Reveals once when scrolled into view. Styles live in globals.css ([data-reveal] / [data-in]). */
export default function Reveal<T extends ElementType = "div">({ as, variant = "zoom", threshold = 0.05, ...rest }: Props<T>) {
  const Tag = (as ?? "div") as ElementType;
  const ref = useRef<HTMLElement>(null);
  const [inView, setInView] = useState(false);
  // zoom: the photo only fades in once its file has arrived, so a slow load shows the dark band behind it
  // rather than next/image's grey blur placeholder (the rest of the entrance doesn't wait)
  const [loaded, setLoaded] = useState(variant !== "zoom");

  useEffect(() => {
    const el = ref.current;
    if (!el || !("IntersectionObserver" in window)) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setInView(true);
          io.disconnect();
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [threshold]);

  // hero: after a client-side navigation (not the first page load, where the photo is preloaded and must
  // paint as early as possible), hide the photo until its file arrives so the dark band shows, not the
  // grey blur placeholder. Runs before paint, so the placeholder never flashes.
  useLayoutEffect(() => {
    if (variant !== "hero") return;
    const el = ref.current;
    const img = el?.querySelector("img");
    if (!el || !img || !(window as { __sbuHydrated?: boolean }).__sbuHydrated) return;
    if (img.complete && img.naturalWidth > 0) return;
    el.setAttribute("data-pending", "");
    const done = () => el.removeAttribute("data-pending");
    img.addEventListener("load", done, { once: true });
    img.addEventListener("error", done, { once: true });
    return () => {
      img.removeEventListener("load", done);
      img.removeEventListener("error", done);
    };
  }, [variant]);

  useEffect(() => {
    if (variant !== "zoom") return;
    const img = ref.current?.querySelector("img");
    if (!img || (img.complete && img.naturalWidth > 0)) {
      setLoaded(true);
      return;
    }
    const done = () => setLoaded(true);
    img.addEventListener("load", done, { once: true });
    img.addEventListener("error", done, { once: true });
    return () => {
      img.removeEventListener("load", done);
      img.removeEventListener("error", done);
    };
  }, [variant]);

  return <Tag ref={ref} data-reveal={variant} data-in={inView ? "" : undefined} data-loaded={loaded ? "" : undefined} {...rest} />;
}
