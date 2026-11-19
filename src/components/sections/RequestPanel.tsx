"use client";

import { useEffect, useRef, useState } from "react";
import RequestCard from "./RequestCard";
import styles from "./RequestPanel.module.css";

/**
 * Slide-over request form, opened by any link to "#request" outside the hero.
 * - A link's `data-service` pre-fills "What do you need?" (e.g. category tiles).
 * - If the hero form is already on screen, focus moves into it instead of opening a second copy.
 * - Without JS the links still jump to the hero form (#request).
 * Native <dialog> gives focus trapping, Esc to close, an inert page behind and focus restore.
 */
export default function RequestPanel({ services }: { services?: string[] }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [service, setService] = useState("");
  // Bumped when opened with a new pre-fill, so the form starts fresh; otherwise a half-filled form is kept.
  const [formKey, setFormKey] = useState(0);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const link = (e.target as Element | null)?.closest<HTMLAnchorElement>('a[href="#request"]');
      if (!link) return;

      e.preventDefault();
      const hero = document.getElementById("request");
      if (hero && isMostlyVisible(hero)) {
        hero.querySelector<HTMLElement>("button, input")?.focus();
        return;
      }

      const next = link.dataset.service ?? "";
      if (next) {
        setService(next);
        setFormKey((k) => k + 1);
      }
      // Let a menu that's closing (e.g. the header panel) finish handling the click first.
      requestAnimationFrame(() => dialogRef.current?.showModal());
    };
    // Capture phase so we run before next/link's own click handling.
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  const close = () => dialogRef.current?.close();

  return (
    <dialog
      ref={dialogRef}
      className={styles.panel}
      aria-labelledby="request-panel-title"
      onClick={(e) => {
        // Clicks on the backdrop land on the <dialog> itself.
        if (e.target === e.currentTarget) close();
      }}
    >
      <div className={styles.inner}>
        <div className={styles.head}>
          <h2 id="request-panel-title" className={styles.title}>
            Make a request
          </h2>
          <button type="button" className={styles.close} onClick={close} aria-label="Close">
            <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
              <path d="M1 1l12 12M13 1 1 13" stroke="currentColor" strokeWidth="1.5" />
            </svg>
          </button>
        </div>
        <p className={styles.intro}>Tell us what you need. We’ll come back with options and a clear quote.</p>
        <RequestCard key={formKey} initialService={service} services={services} className={styles.form} />
      </div>
    </dialog>
  );
}

function isMostlyVisible(el: HTMLElement) {
  const r = el.getBoundingClientRect();
  const visible = Math.min(r.bottom, window.innerHeight) - Math.max(r.top, 0);
  return visible > r.height * 0.6;
}
