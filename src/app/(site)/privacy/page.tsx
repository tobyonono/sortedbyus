import { pageMeta } from "@/lib/seo";
import Legal from "@/components/sections/Legal";
import { getLegal } from "@/lib/sanity/queries";
import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  const c = await getLegal("legal-privacy");
  return pageMeta({ title: c.title, description: c.seoDescription || "Privacy policy for Sorted by Us.", path: "/privacy" });
}

/** Text from Sanity (Legal → Privacy policy). */
export default async function Page() {
  const c = await getLegal("legal-privacy");
  return <Legal title={c.title} updated={c.updated} sections={(c.sections ?? []).map((s) => ({ h: s.heading, p: s.body.split(/\n\s*\n/) }))} />;
}
