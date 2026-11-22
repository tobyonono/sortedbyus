// next/link outside Next: the site's Button module imports it, and the motion harness has no router.
import type { AnchorHTMLAttributes } from "react";

export default function Link({ href, ...rest }: Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & { href: unknown }) {
  return <a href={typeof href === "string" ? href : undefined} {...rest} />;
}
