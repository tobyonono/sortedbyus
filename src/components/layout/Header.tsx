"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import Wordmark from "@/components/ui/Wordmark";
import { Arrow } from "@/components/ui/Button";
import { nav, serviceNav, site, whatsappHref } from "@/lib/site";
import styles from "./Header.module.css";

/** How far (px) you scroll back up before the hidden header slides back in. */
const REVEAL_AFTER = 48;

type Mode = "top" | "hidden" | "shown";

export default function Header({
  services = serviceNav,
  whatsappHref: waHref = whatsappHref(),
  whatsappDisplay = site.whatsappDisplay,
  email = site.email,
}: {
  services?: { label: string; href: string }[];
  whatsappHref?: string;
  whatsappDisplay?: string;
  email?: string;
} = {}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  // the current page's link keeps its underline (the active-page indicator)
  const current = (href: string) => (pathname === href ? "page" : undefined);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const headerRef = useRef<HTMLElement>(null);
  // "top": in the page flow (normal). Once scrolled past it, the header is fixed: "hidden" (slid up out
  // of view) while scrolling down, "shown" after scrolling back up a bit. `animate` is false for the
  // top → hidden swap, which happens off-screen and must not slide.
  const [{ mode, animate }, setState] = useState<{
    mode: Mode;
    animate: boolean;
  }>({ mode: "top", animate: false });
  const [slotH, setSlotH] = useState<number>();

  useEffect(() => {
    const header = headerRef.current;
    if (!header) return;
    let lastY = window.scrollY;
    let upBy = 0;
    let current: Mode = "top";
    let raf = 0;
    const set = (next: Mode, anim: boolean) => {
      if (next === current) return;
      if (current === "top") setSlotH(header.offsetHeight); // hold its space while it's fixed
      if (next === "top") setSlotH(undefined);
      current = next;
      setState({ mode: next, animate: anim });
    };
    const update = () => {
      raf = 0;
      const y = Math.max(0, window.scrollY);
      const dy = y - lastY;
      lastY = y;
      const h = header.offsetHeight;
      if (y <= 0) return set("top", false);
      if (dy > 0) {
        upBy = 0;
        if (y > h) set("hidden", current === "shown");
      } else if (dy < 0 && current === "hidden") {
        upBy -= dy;
        if (upBy >= REVEAL_AFTER || y < h) set("shown", true);
      }
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        toggleRef.current?.focus();
      }
    };
    document.documentElement.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.documentElement.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div style={{ height: slotH }}>
      <header
        ref={headerRef}
        className={styles.header}
        // Opening the menu only needs to bring a hidden (scrolled-away) header back. At the top it stays
        // in the page flow — switching it to fixed there pulled the hero up by the header's height.
        data-mode={open && mode === "hidden" ? "shown" : mode}
        data-animate={animate || undefined}
      >
        <Link href="/" className={styles.mark}>
          <Wordmark title={`${site.name} home`} />
        </Link>
        <div className={styles.right}>
          <a
            className={`${styles.wa} hover-link`}
            href={waHref}
            target="_blank"
            rel="noreferrer"
          >
            WhatsApp
          </a>
          <button
            ref={toggleRef}
            className={styles.menuBtn}
            aria-expanded={open}
            aria-controls="site-menu"
            onClick={() => {
              // warm the menu destinations' hero photos (HeroPrefetch)
              if (!open) window.dispatchEvent(new Event("sbu:menu-open"));
              setOpen((o) => !o);
            }}
          >
            <span>{open ? "Close" : "Menu"}</span>
            <span className={styles.burger} data-open={open} aria-hidden="true">
              <i />
              <i />
              <i />
            </span>
          </button>
        </div>

        <div
          id="site-menu"
          className={styles.panel}
          data-open={open}
          aria-hidden={!open}
          inert={!open}
        >
          <nav aria-label="Main" className={styles.panelNav}>
            {/* What we do: the six service pages, grouped under one heading */}
            <div className={styles.group}>
              <p className={styles.groupHead} style={open ? { transitionDelay: "0ms" } : undefined}>What we do</p>
              <ul className={styles.subList}>
                {services.map((item, i) => (
                  <li key={item.href} style={open ? { transitionDelay: `${(i + 1) * 30}ms` } : undefined}>
                    <Link href={item.href} onClick={() => setOpen(false)} className="hover-link" aria-current={current(item.href)}>
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <ul className={styles.mainList}>
              {nav.map((item, i) => (
                // Røros stagger: 30ms between links (only while opening; closing just fades the panel)
                <li key={item.href} style={open ? { transitionDelay: `${i * 30}ms` } : undefined}>
                  <Link href={item.href} onClick={() => setOpen(false)} className="hover-link" aria-current={current(item.href)}>
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <div className={styles.panelFoot}>
            <Link
              href="/#request"
              onClick={() => setOpen(false)}
              className={styles.panelCta}
            >
              Make a request <Arrow />
            </Link>
            <div className={styles.panelContact}>
              <a
                className="hover-link"
                href={waHref}
                target="_blank"
                rel="noreferrer"
              >
                WhatsApp {whatsappDisplay}
              </a>
              <a className="hover-link" href={`mailto:${email}`}>
                {email}
              </a>
            </div>
          </div>
        </div>
      </header>
    </div>
  );
}
