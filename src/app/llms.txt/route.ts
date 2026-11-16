import { site } from "@/lib/site";
import { sanityFetch } from "@/sanity/client";

// Built once at build time, like the pages.
export const dynamic = "force-static";

/** /llms.txt (llmstxt.org): a plain-language summary of the site and its pages for AI assistants. */
export async function GET() {
  const serviceList = await sanityFetch<{ title: string; slug: string; intro: string; offer: { title: string }[] }[]>(
    `*[_type == "service" && defined(slug.current)] | order(order asc){title, "slug": slug.current, intro, "offer": offers[]{title}}`,
  );
  const u = (path: string) => `${site.url}${path}`;
  const body = `# ${site.name}

> ${site.description}

${site.name} is a personal concierge and solutions company based in Lagos, with a team on the ground in Abuja. People message us (on WhatsApp or through the website) with what they need; we find the right option from suppliers we know, send one clear quote with our fee included, and arrange it once it's approved and paid by bank transfer. We keep the client updated on WhatsApp until it's delivered, done and closed. Many clients live abroad and use us to sort things for family in Nigeria.

## Services

${serviceList.map((s) => `- [${s.title}](${u(`/services/${s.slug}`)}): ${s.intro} Includes: ${s.offer.map((o) => o.title.toLowerCase()).join(", ")}.`).join("\n")}

## About the service

- [How it works](${u("/how-it-works")}): the steps from first message to done, what it costs, how payment works and what happens if something goes wrong.
- [Corporate services](${u("/corporate")}): concierge support for companies (travel, procurement, client gifts, events, employee concierge), per request, per project or on retainer.
- [About us](${u("/about")}): who we are and how we work.
- [Contact](${u("/contact")}): WhatsApp, email and a contact form.

## Optional

- [Privacy policy](${u("/privacy")})
- [Terms of service](${u("/terms")})
`;
  return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
