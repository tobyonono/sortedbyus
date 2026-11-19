import type { Pic } from "@/lib/sanity/image";

/** next/image props for a Pic: blurred preview while loading, and the editor's focal point. */
export const picProps = (p: Pic) => ({
  src: p.src,
  placeholder: (p.blur || typeof p.src !== "string" ? "blur" : "empty") as "blur" | "empty",
  ...(p.blur ? { blurDataURL: p.blur } : {}),
});
