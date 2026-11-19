"use client";

import { prefersReducedMotion } from "@/lib/motion";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import styles from "./Calendar.module.css";

const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
const monthFmt = new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric" });
const dayFmt = new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const sameDay = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

/** Month-grid date picker (ARIA grid). Days before `min` are disabled. */
export default function Calendar({
  value,
  min,
  onSelect,
  onClose,
}: {
  value: Date | null;
  min: Date;
  onSelect: (d: Date) => void;
  onClose: () => void;
}) {
  const minDay = startOfDay(min);
  const [focus, setFocus] = useState<Date>(value ?? minDay);
  const [view, setView] = useState(() => new Date((value ?? minDay).getFullYear(), (value ?? minDay).getMonth(), 1));
  const gridRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  // Once open (after its entrance, so it's measured at full size), if the calendar runs past the bottom
  // of the screen or of the request panel, scroll just enough to show all of it plus its scroll-margin.
  // Does nothing when it already fits.
  const revealFully = () => {
    const reduce = prefersReducedMotion();
    rootRef.current?.scrollIntoView({ block: "nearest", behavior: reduce ? "auto" : "smooth" });
  };
  useEffect(() => {
    // reduced motion skips the entrance, so there may be no animationend
    if (prefersReducedMotion()) revealFully();
  }, []);

  useEffect(() => {
    // preventScroll: focusing a day mustn't jump the page; the open scroll above handles visibility
    gridRef.current?.querySelector<HTMLButtonElement>('[data-focus="true"]')?.focus({ preventScroll: true });
  }, [focus, view]);

  const first = new Date(view.getFullYear(), view.getMonth(), 1);
  const offset = (first.getDay() + 6) % 7; // Monday-first
  const daysInMonth = new Date(view.getFullYear(), view.getMonth() + 1, 0).getDate();
  const cells: (Date | null)[] = [
    ...Array.from({ length: offset }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => new Date(view.getFullYear(), view.getMonth(), i + 1)),
  ];
  const canPrev = new Date(view.getFullYear(), view.getMonth(), 0) >= minDay;

  const move = (d: Date) => {
    const next = d < minDay ? minDay : d;
    setFocus(next);
    if (next.getMonth() !== view.getMonth() || next.getFullYear() !== view.getFullYear())
      setView(new Date(next.getFullYear(), next.getMonth(), 1));
  };
  const shiftMonth = (n: number) => {
    const v = new Date(view.getFullYear(), view.getMonth() + n, 1);
    setView(v);
    const d = new Date(v.getFullYear(), v.getMonth(), Math.min(focus.getDate(), new Date(v.getFullYear(), v.getMonth() + 1, 0).getDate()));
    setFocus(d < minDay ? minDay : d);
  };

  const onKey = (e: KeyboardEvent) => {
    const map: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
    if (e.key in map) move(addDays(focus, map[e.key]));
    else if (e.key === "PageUp") shiftMonth(-1);
    else if (e.key === "PageDown") shiftMonth(1);
    else if (e.key === "Escape") onClose();
    else return;
    e.preventDefault();
  };

  return (
    <div
      ref={rootRef}
      className={styles.cal}
      role="dialog"
      aria-label="Choose a date"
      onAnimationEnd={(e) => e.target === e.currentTarget && revealFully()}
    >
      <div className={styles.head}>
        <button type="button" className={styles.nav} onClick={() => shiftMonth(-1)} disabled={!canPrev} aria-label="Previous month">
          <svg width="8" height="12" viewBox="0 0 8 12" aria-hidden="true">
            <path d="M7 1 2 6l5 5" fill="none" stroke="currentColor" strokeWidth="1.6" />
          </svg>
        </button>
        <p className={styles.month} aria-live="polite">
          {monthFmt.format(view)}
        </p>
        <button type="button" className={styles.nav} onClick={() => shiftMonth(1)} aria-label="Next month">
          <svg width="8" height="12" viewBox="0 0 8 12" aria-hidden="true">
            <path d="m1 1 5 5-5 5" fill="none" stroke="currentColor" strokeWidth="1.6" />
          </svg>
        </button>
      </div>
      <div className={styles.grid} role="grid" ref={gridRef} onKeyDown={onKey}>
        {WEEKDAYS.map((w) => (
          <span key={w} className={styles.wd} role="columnheader">
            {w}
          </span>
        ))}
        {cells.map((d, i) =>
          d ? (
            <button
              key={i}
              type="button"
              role="gridcell"
              className={styles.day}
              disabled={d < minDay}
              tabIndex={sameDay(d, focus) ? 0 : -1}
              data-focus={sameDay(d, focus)}
              data-today={sameDay(d, minDay)}
              aria-selected={!!value && sameDay(d, value)}
              aria-label={dayFmt.format(d)}
              onClick={() => onSelect(d)}
            >
              {d.getDate()}
            </button>
          ) : (
            <span key={i} />
          ),
        )}
      </div>
    </div>
  );
}
