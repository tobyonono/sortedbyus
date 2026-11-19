"use client";

import { useId, useState } from "react";
import styles from "./Accordion.module.css";

export type AccordionItem = { q: string; a: string };

export default function Accordion({ items, defaultOpen = -1 }: { items: AccordionItem[]; defaultOpen?: number }) {
  const [open, setOpen] = useState(defaultOpen);
  const base = useId();
  return (
    <div className={styles.list}>
      {items.map((it, i) => {
        const isOpen = open === i;
        const id = `${base}-${i}`;
        return (
          <div className={styles.item} key={it.q} data-open={isOpen}>
            <h3>
              <button
                className={styles.trigger}
                aria-expanded={isOpen}
                aria-controls={id}
                onClick={() => setOpen(isOpen ? -1 : i)}
              >
                <span>{it.q}</span>
                <svg className={styles.caret} width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
                  <path d="M.5 1.5h13L7 13z" fill="currentColor" />
                </svg>
              </button>
            </h3>
            <div className={styles.panel} id={id} role="region" aria-hidden={!isOpen}>
              <div>
                <p>{it.a}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
