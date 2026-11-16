import Studio from "./Studio";

export const dynamic = "force-static";
export { metadata, viewport } from "next-sanity/studio";

/** Sanity Studio at /studio, where the site's content is edited. */
export default function StudioPage() {
  return <Studio />;
}
