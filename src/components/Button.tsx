import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import styles from "./Button.module.css";

type Variant = "primary" | "outline" | "outline-light";

type Common = { variant?: Variant; arrow?: boolean; children: ReactNode; className?: string; full?: boolean };

export function Arrow() {
  return (
    // Solid arrow: short shaft, angular head (Bakken & Bæck journal style)
    <svg className={styles.arrow} width="16" height="12" viewBox="0 0 16 12" aria-hidden="true">
      <path d="M0 5.25h12.2L8.5 1.55 9.55.5 15.05 6l-5.5 5.5-1.05-1.05 3.7-3.7H0z" fill="currentColor" />
    </svg>
  );
}

const cls = (variant: Variant, full?: boolean, extra?: string) =>
  [styles.btn, styles[variant], full ? styles.full : "", extra ?? ""].join(" ");

export function ButtonLink({ variant = "outline", arrow, children, className, full, ...rest }: Common & ComponentProps<typeof Link>) {
  // In-page anchors ("#offer") are plain <a>s: next/link skips the scroll when the URL already has that
  // hash, so clicking again after scrolling away would do nothing. The browser always scrolls.
  if (typeof rest.href === "string" && rest.href.startsWith("#")) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { href, prefetch, replace, scroll, shallow, passHref, legacyBehavior, locale, onNavigate, ...anchor } = rest;
    return (
      <a href={href} className={cls(variant, full, className)} {...anchor}>
        <span>{children}</span>
        {arrow && <Arrow />}
      </a>
    );
  }
  return (
    <Link className={cls(variant, full, className)} {...rest}>
      <span>{children}</span>
      {arrow && <Arrow />}
    </Link>
  );
}

export function Button({ variant = "outline", arrow, children, className, full, ...rest }: Common & ComponentProps<"button">) {
  return (
    <button className={cls(variant, full, className)} {...rest}>
      <span>{children}</span>
      {arrow && <Arrow />}
    </button>
  );
}
