import { site } from "@/lib/site";

/** Structured data for search engines (schema.org JSON-LD). */
export default function JsonLd({ data }: { data: Record<string, unknown> }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }} />;
}

/** The business, referenced by id from each service. */
export const business = {
  "@context": "https://schema.org",
  "@type": "ProfessionalService",
  "@id": `${site.url}/#business`,
  name: site.name,
  url: site.url,
  description: site.description,
  slogan: site.tagline,
  email: site.email,
  image: `${site.url}/og.jpg`,
  logo: `${site.url}/apple-icon.png`,
  address: { "@type": "PostalAddress", addressLocality: "Lagos", addressCountry: "NG" },
  areaServed: [
    { "@type": "City", name: "Lagos" },
    { "@type": "City", name: "Abuja" },
    { "@type": "Country", name: "Nigeria" },
  ],
};
