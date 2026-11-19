import { defineQuery } from "groq";
import { sanityFetch } from "./client";
import { IMG } from "./image";

/* Every query is a defineQuery constant: `npm run typegen` reads them and writes their exact result types to
   types.ts (from the Studio schema), and sanityFetch picks those types up by query. Change a query or the
   schema, run typegen, and the type checker shows every page the change affects. */

/** Single pages must exist: a missing document fails the build with a clear message instead of deploying a blank page. */
async function required<T>(result: Promise<T | null>, name: string): Promise<T> {
  const doc = await result;
  if (!doc) throw new Error(`Sanity: the "${name}" document is missing or unpublished. Publish it in the Studio.`);
  return doc;
}

const homeQuery = defineQuery(`*[_type == "homePage" && _id == "homePage"][0]{..., heroImage${IMG}, catchallImage${IMG}, corpImage${IMG}, closingImage${IMG},
    examples[]{label, text, image${IMG}}, processSteps[]{title, body, image${IMG}}, audiences[]{label, heading, body, button, image${IMG}}}`);
export const getHome = () => required(sanityFetch(homeQuery), "Home page");

const serviceQuery = defineQuery(`*[_type == "service" && slug.current == $slug][0]{title, "slug": slug.current, short, heroHeading, intro, heroImage${IMG}, offers[]{title, body},
  examples[]{label, text, image${IMG}}, sideImage${IMG}, faqs[]{q, a}, closingImage${IMG}, breakText, breakImage${IMG}, breakLevels, seoDescription}`);
export const getService = (slug: string) => sanityFetch(serviceQuery, { slug });

const serviceSlugsQuery = defineQuery(`*[_type == "service" && defined(slug.current)].slug.current`);
export const getServiceSlugs = () => sanityFetch(serviceSlugsQuery);

const howItWorksQuery = defineQuery(`*[_type == "howItWorksPage" && _id == "howItWorksPage"][0]{..., heroImage${IMG}, breakImage${IMG}, closingImage${IMG}, steps[]{title, body, image${IMG}}}`);
export const getHowItWorks = () => required(sanityFetch(howItWorksQuery), "How it works page");

const corporateQuery = defineQuery(`*[_type == "corporatePage" && _id == "corporatePage"][0]{..., heroImage${IMG}, breakImage${IMG}, closingImage${IMG},
    offers[]{title, body, items, image${IMG}}, people[]{title, body, showButton, image${IMG}}}`);
export const getCorporate = () => required(sanityFetch(corporateQuery), "Corporate page");

const aboutQuery = defineQuery(`*[_type == "aboutPage" && _id == "aboutPage"][0]{..., heroImage${IMG}, whereImage${IMG}, breakImage${IMG}, closingImage${IMG}, values[]{title, body, buttonLabel, buttonLink, image${IMG}}}`);
export const getAbout = () => required(sanityFetch(aboutQuery), "About page");

const contactQuery = defineQuery(`*[_type == "contactPage" && _id == "contactPage"][0]{..., heroImage${IMG}}`);
export const getContact = () => required(sanityFetch(contactQuery), "Contact page");

const legalQuery = defineQuery(`*[_type == "legalPage" && _id == $id][0]{title, updated, sections[]{heading, body}, seoDescription}`);
export const getLegal = (id: "legal-privacy" | "legal-terms") => required(sanityFetch(legalQuery, { id }), id);

/** Hero photo per route, for warming the next page's photo on hover (HeroPrefetch). */
const heroesQuery = defineQuery(`[
    {"path": "/", "url": *[_type == "homePage" && _id == "homePage"][0].heroImage.asset->url},
    {"path": "/how-it-works", "url": *[_type == "howItWorksPage" && _id == "howItWorksPage"][0].heroImage.asset->url},
    {"path": "/corporate", "url": *[_type == "corporatePage" && _id == "corporatePage"][0].heroImage.asset->url},
    {"path": "/about", "url": *[_type == "aboutPage" && _id == "aboutPage"][0].heroImage.asset->url},
    {"path": "/contact", "url": *[_type == "contactPage" && _id == "contactPage"][0].heroImage.asset->url}
  ] + *[_type == "service" && defined(slug.current)]{"path": "/services/" + slug.current, "url": heroImage.asset->url}`);
export const getHeroes = () => sanityFetch(heroesQuery);
