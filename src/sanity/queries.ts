import { sanityFetch } from "./client";
import { IMG, type SanityImg } from "./image";

type Faq = { q: string; a: string };
type Item = { title: string; body: string };
type Example = { label: string; text: string; image?: SanityImg };

export type Home = {
  heroHeading: string; heroButton: string; heroImage: SanityImg;
  offerLabel: string; offerHeading: string; offerIntro: string;
  catchallLabel: string; catchallHeading: string; catchallBody: string; catchallButton: string; catchallImage: SanityImg;
  examplesLabel: string; examplesHeading: string; examples: Example[];
  processHeading: string; processSteps: { title: string; body: string; image: SanityImg }[];
  whoLabel: string; whoHeading: string; whoIntro: string;
  audiences: { label: string; heading: string; body: string; button: string; image: SanityImg }[];
  corpLabel: string; corpHeading: string; corpBody: string; corpButton: string; corpImage: SanityImg;
  faqHeading: string; faqs: Faq[];
  closingHeading: string; closingButton: string; closingImage: SanityImg;
  seoDescription?: string;
};
export const getHome = () =>
  sanityFetch<Home>(`*[_id == "homePage"][0]{..., heroImage${IMG}, catchallImage${IMG}, corpImage${IMG}, closingImage${IMG},
    examples[]{label, text, image${IMG}}, processSteps[]{title, body, image${IMG}}, audiences[]{label, heading, body, button, image${IMG}}}`);

export type Service = {
  title: string; slug: string; short: string; heroHeading: string; intro: string; heroImage: SanityImg;
  offers: Item[]; examples: Example[]; sideImage: SanityImg; faqs: Faq[]; closingImage?: SanityImg; seoDescription?: string;
};
const SERVICE = `{title, "slug": slug.current, short, heroHeading, intro, heroImage${IMG}, offers[]{title, body},
  examples[]{label, text, image${IMG}}, sideImage${IMG}, faqs[]{q, a}, closingImage${IMG}, seoDescription}`;
export const getService = (slug: string) => sanityFetch<Service | null>(`*[_type == "service" && slug.current == $slug][0]${SERVICE}`, { slug });
export const getServiceSlugs = () => sanityFetch<string[]>(`*[_type == "service" && defined(slug.current)].slug.current`);

export type HowItWorks = {
  heroHeading: string; heroIntro: string; heroImage: SanityImg;
  stepsLabel: string; stepsHeading: string; stepsIntro: string;
  steps: { title: string; summary: string; you: string; we: string; timing: string; image: SanityImg }[];
  behindLabel: string; behindHeading: string; behindPoints: Item[];
  costsLabel: string; costsHeading: string; costs: Item[];
  wrongLabel: string; wrongHeading: string; wrongIntro: string; wrong: Item[];
  faqs: Faq[]; closingHeading: string; closingImage: SanityImg; seoDescription?: string;
};
export const getHowItWorks = () =>
  sanityFetch<HowItWorks>(`*[_id == "howItWorksPage"][0]{..., heroImage${IMG}, closingImage${IMG}, steps[]{title, summary, you, we, timing, image${IMG}}}`);

export type Corporate = {
  heroHeading: string; heroIntro: string; heroImage: SanityImg; ctaLabel: string;
  offersLabel: string; offersHeading: string; offersIntro: string;
  offers: { title: string; body: string; items?: string[]; image: SanityImg }[];
  peopleLabel: string; peopleHeading: string; people: { title: string; body: string; showButton?: boolean; image: SanityImg }[];
  modelsLabel: string; modelsHeading: string; modelsIntro: string; models: { title: string; body: string; bestFor: string }[];
  faqs: Faq[]; closingHeading: string; closingImage: SanityImg; seoDescription?: string;
};
export const getCorporate = () =>
  sanityFetch<Corporate>(`*[_id == "corporatePage"][0]{..., heroImage${IMG}, closingImage${IMG},
    offers[]{title, body, items, image${IMG}}, people[]{title, body, showButton, image${IMG}}}`);

export type About = {
  heroHeading: string; heroIntro: string; heroImage: SanityImg;
  storyLabel: string; storyHeading: string; storySignName?: string; storySignRole?: string; story: { _key: string; children: { _key: string; text: string; marks?: string[] }[] }[];
  valuesLabel: string; valuesHeading: string; values: { title: string; body: string; buttonLabel?: string; buttonLink?: string; image: SanityImg }[];
  whereLabel: string; whereHeading: string; whereList: string[]; whereImage: SanityImg; closingImage: SanityImg; seoDescription?: string;
};
export const getAbout = () =>
  sanityFetch<About>(`*[_id == "aboutPage"][0]{..., heroImage${IMG}, whereImage${IMG}, closingImage${IMG}, values[]{title, body, buttonLabel, buttonLink, image${IMG}}}`);

export type Contact = { heroHeading: string; heroIntro: string; heroImage: SanityImg; formLabel: string; formHeading: string; formIntro: string; seoDescription?: string };
export const getContact = () => sanityFetch<Contact>(`*[_id == "contactPage"][0]{..., heroImage${IMG}}`);

export type Legal = { title: string; updated?: string; sections: { heading: string; body: string }[]; seoDescription?: string };
export const getLegal = (id: "legal-privacy" | "legal-terms") => sanityFetch<Legal>(`*[_id == $id][0]{title, updated, sections[]{heading, body}, seoDescription}`, { id });

/** Hero photo per route, for warming the next page's photo on hover (HeroPrefetch). */
export const getHeroes = () =>
  sanityFetch<{ path: string; url: string }[]>(`[
    {"path": "/", "url": *[_id == "homePage"][0].heroImage.asset->url},
    {"path": "/how-it-works", "url": *[_id == "howItWorksPage"][0].heroImage.asset->url},
    {"path": "/corporate", "url": *[_id == "corporatePage"][0].heroImage.asset->url},
    {"path": "/about", "url": *[_id == "aboutPage"][0].heroImage.asset->url},
    {"path": "/contact", "url": *[_id == "contactPage"][0].heroImage.asset->url}
  ] + *[_type == "service" && defined(slug.current)]{"path": "/services/" + slug.current, "url": heroImage.asset->url}`);
