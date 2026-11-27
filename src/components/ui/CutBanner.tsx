import Image from "next/image";
import type { Pic } from "@/lib/sanity/image";
import { picProps } from "./picProps";
import type { ComponentPropsWithoutRef, ReactNode } from "react";
import Reveal from "./Reveal";
import styles from "./CutBanner.module.css";

/**
 * Narai-style banner: a full photo with a solid colour block cut on a diagonal across one side.
 * The block is static; once ~35% of the banner is in view, the content rises in.
 * `mirror` puts the shapes on the left. Content (heading, button…) sits centred on top.
 */
export default function CutBanner({
  as = "section",
  base,
  tone = "var(--tan)",
  mirror = false,
  block = true,
  align = "center",
  step = false,
  className = "",
  children,
  style,
  ...rest
}: {
  as?: "section" | "div";
  /** Photo behind the block. Omit for a flat colour background (set --cut-bg, default espresso). */
  base?: Pic;
  /** Colour of the solid block (any CSS colour / var). */
  tone?: string;
  mirror?: boolean;
  /** false = photo only, no colour block (content still rises in on reveal). */
  block?: boolean;
  /** "start"/"end" sit the content at the left/right edge (put it on the block's side) instead of centred. */
  align?: "center" | "start" | "end";
  /** the diagonal as the double cut turned on its side: two slanted runs with a soft jog back at half height
   *  (desktop). Set --edge-top further in than --edge-bottom, so the photo steps in on the bottom half. */
  step?: boolean;
  className?: string;
  children: ReactNode;
} & Omit<ComponentPropsWithoutRef<"section">, "children">) {
  return (
    <Reveal
      as={as}
      variant="cut"
      threshold={0.35}
      className={`${styles.cut} ${className}`}
      data-mirror={mirror || undefined}
      data-block={block || undefined}
      data-align={align}
      data-step={step || undefined}
      style={{ ["--tone" as string]: tone, ...(base?.focus ? { ["--base-pos" as string]: base.focus } : {}), ...style }}
      {...rest}
    >
      {base && (
        <div className={styles.base}>
          <Image {...picProps(base)} alt="" fill sizes="100vw" />
        </div>
      )}
      {block && <div className={styles.block} />}
      <div className={styles.content}>{children}</div>
    </Reveal>
  );
}
