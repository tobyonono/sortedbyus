import { pageMeta } from "@/lib/seo";
import Legal from "../_ui/Legal";
import { getLegal } from "@/sanity/queries";
import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  const c = await getLegal("legal-terms");
  return pageMeta({ title: c.title, description: c.seoDescription || "Terms of service for Sorted by Us.", path: "/terms" });
}

/** Text from Sanity (Legal → Terms of service). */
export default async function Page() {
  const c = await getLegal("legal-terms");
  return <Legal title={c.title} updated={c.updated} sections={c.sections.map((s) => ({ h: s.heading, p: s.body.split(/\n\s*\n/) }))} />;
}
