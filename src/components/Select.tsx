"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import styles from "./Select.module.css";

type Props = {
  label: string;
  options: string[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
};

/** Styled single-select (ARIA listbox pattern). Controlled. */
export default function Select({ label, options, value, onChange, placeholder }: Props) {
  const setValue = onChange;
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const id = useId();

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    listRef.current?.focus();
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);

  const openList = () => {
    setActive(Math.max(0, options.indexOf(value)));
    setOpen(true);
  };
  const choose = (i: number) => {
    setValue(options[i]);
    setOpen(false);
    btnRef.current?.focus();
  };

  const onButtonKey = (e: KeyboardEvent) => {
    if (["ArrowDown", "ArrowUp", "Enter", " "].includes(e.key)) {
      e.preventDefault();
      openList();
    }
  };
  const onListKey = (e: KeyboardEvent) => {
    if (e.key === "ArrowDown") setActive((a) => Math.min(options.length - 1, a + 1));
    else if (e.key === "ArrowUp") setActive((a) => Math.max(0, a - 1));
    else if (e.key === "Home") setActive(0);
    else if (e.key === "End") setActive(options.length - 1);
    else if (e.key === "Enter" || e.key === " ") choose(active);
    else if (e.key === "Escape" || e.key === "Tab") {
      setOpen(false);
      if (e.key === "Escape") btnRef.current?.focus();
      return;
    } else {
      const i = options.findIndex((o) => o.toLowerCase().startsWith(e.key.toLowerCase()));
      if (i >= 0) setActive(i);
      return;
    }
    e.preventDefault();
  };

  return (
    <div className={styles.root} ref={rootRef} data-open={open}>
      <span className="visually-hidden" id={`${id}-label`}>
        {label}
      </span>
      <button
        ref={btnRef}
        type="button"
        className={styles.button}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-labelledby={`${id}-label ${id}-value`}
        onClick={() => (open ? setOpen(false) : openList())}
        onKeyDown={onButtonKey}
      >
        <span id={`${id}-value`} className={value ? "" : styles.placeholder}>
          {value || placeholder}
        </span>
        <svg className={styles.caret} width="10" height="8" viewBox="0 0 10 8" aria-hidden="true">
          <path d="M0 0.5h10L5 7.5z" fill="currentColor" />
        </svg>
      </button>
      {open && (
        <ul
          ref={listRef}
          className={styles.list}
          role="listbox"
          tabIndex={-1}
          aria-labelledby={`${id}-label`}
          aria-activedescendant={`${id}-opt-${active}`}
          onKeyDown={onListKey}
        >
          {options.map((o, i) => (
            <li
              key={o}
              id={`${id}-opt-${i}`}
              role="option"
              aria-selected={o === value}
              data-active={i === active}
              onPointerEnter={() => setActive(i)}
              onClick={() => choose(i)}
            >
              <span>{o}</span>
              {o === value && (
                <svg width="14" height="11" viewBox="0 0 14 11" aria-hidden="true">
                  <path d="M1 5.5 5 9.5 13 1" fill="none" stroke="currentColor" strokeWidth="1.6" />
                </svg>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
