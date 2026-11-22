// next/link outside Next: the site's Button module imports it, and the motion studio (Sanity Studio
// and the harness) has no Next router. Aliased in sanity.cli.ts and motion/studio/vite.config.ts.
import type { AnchorHTMLAttributes } from "react";

export default function Link({ href, ...rest }: Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & { href: unknown }) {
  return <a href={typeof href === "string" ? href : undefined} {...rest} />;
}
