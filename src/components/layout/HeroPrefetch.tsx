"use client";

import { useEffect } from "react";
import imageLoader from "@/lib/image-loader";
const HERO_SIZES = "(min-width: 901px) 122vw, 100vw";

// next/image's default device sizes: the same srcset the hero <img> gets, so the browser picks the same file.
const WIDTHS = [640, 750, 828, 1080, 1200, 1920, 2048, 3840];
const done = new Set<string>();
let heroes: Record<string, string> = {};

function warm(path: string) {
  const hero = heroes[path];
  if (!hero || done.has(path) || path === location.pathname) return;
  done.add(path);
  const img = new Image();
  img.sizes = HERO_SIZES;
  img.srcset = WIDTHS.map((w) => `${imageLoader({ src: hero, width: w })} ${w}w`).join(", ");
}

const pathOf = (el: EventTarget | null) => {
  const a = (el as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
  if (!a || a.origin !== location.origin) return null;
  return a.pathname.replace(/\/$/, "") || "/";
};

/**
 * Next prefetches a page's code, not its images, so a click-through used to show the hero's blurred
 * placeholder while the photo downloaded. This starts the destination's hero photo downloading as soon as
 * someone points at, focuses or touches a link to it, and fetches every menu destination when the menu
 * opens (Header fires "sbu:menu-open").
 */
export default function HeroPrefetch({ map }: { map: Record<string, string> }) {
  useEffect(() => {
    heroes = map;
    // first page load has hydrated: from here on, page changes are client-side navigations (Reveal "hero")
    (window as { __sbuHydrated?: boolean }).__sbuHydrated = true;
    const onIntent = (e: Event) => {
      const p = pathOf(e.target);
      if (p) warm(p);
    };
    const onMenu = () => Object.keys(heroes).forEach(warm);
    document.addEventListener("pointerover", onIntent, { passive: true });
    document.addEventListener("focusin", onIntent);
    document.addEventListener("touchstart", onIntent, { passive: true });
    window.addEventListener("sbu:menu-open", onMenu);
    return () => {
      document.removeEventListener("pointerover", onIntent);
      document.removeEventListener("focusin", onIntent);
      document.removeEventListener("touchstart", onIntent);
      window.removeEventListener("sbu:menu-open", onMenu);
    };
  }, [map]);
  return null;
}
