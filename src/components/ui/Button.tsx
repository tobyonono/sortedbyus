import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import styles from "./Button.module.css";

type Variant = "primary" | "outline" | "outline-light";

type Common = { variant?: Variant; arrow?: boolean; children: ReactNode; className?: string; full?: boolean };

export function Arrow() {
  return (
    // Thin shaft, open angled head (Bakken & Bæck journal card arrow), drawn 14×12 to match the old arrow's size
    <svg className={styles.arrow} width="14" height="12" viewBox="0 0 8.67 7.35" aria-hidden="true">
      <path d="M4.51 6.47L7.06 4.1L0 4.33V3.02L7.05 3.27L4.51 0.87L5.38 0L8.67 3.69L5.38 7.35L4.51 6.48V6.47Z" fill="currentColor" />
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
