// One-off: moves the site's hard-coded content and full-resolution photos into Sanity.
// Run: node scripts/import-to-sanity.mjs   (reads SANITY_WRITE_TOKEN from .env.local)
// Safe to re-run: documents have fixed IDs and are replaced; identical photos are de-duplicated by Sanity.
import { createClient } from "@sanity/client";
import { readFileSync, createReadStream } from "node:fs";

const env = Object.fromEntries(readFileSync(".env.local", "utf8").split("\n").filter(Boolean).map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1)]));
const client = createClient({ projectId: "g0dqg5p9", dataset: "production", apiVersion: "2026-11-01", token: env.SANITY_WRITE_TOKEN, useCdn: false });

const assets = new Map();
let k = 0;
const key = () => `k${(k++).toString(36)}${Math.random().toString(36).slice(2, 6)}`;

/** Upload a photo from src/assets/home (the full-resolution originals) once and return an image field. */
async function img(file, alt, focus) {
  if (!assets.has(file)) {
    const a = await client.assets.upload("image", createReadStream(`src/assets/home/${file}.jpg`), { filename: `${file}.jpg` });
    assets.set(file, a._id);
    process.stdout.write(".");
  }
  const field = { _type: "image", asset: { _type: "reference", _ref: assets.get(file) }, alt };
  if (focus) {
    const [x, y] = focus;
    field.hotspot = { _type: "sanity.imageHotspot", x, y, width: 0.3, height: 0.3 };
    field.crop = { _type: "sanity.imageCrop", top: 0, bottom: 0, left: 0, right: 0 };
  }
  return field;
}
const items = (arr) => arr.map((o) => ({ _key: key(), ...o }));
const titled = (arr) => items(arr.map(([title, body]) => ({ _type: "item", title, body })));
const faq = (arr) => items(arr.map(([q, a]) => ({ _type: "faq", q, a })));

const site = {
  _id: "siteSettings", _type: "siteSettings",
  whatsappNumber: "2348000000000", whatsappDisplay: "+234 800 000 0000", email: "hello@sortedbyus.com",
  instagram: "https://instagram.com/", linkedin: "https://linkedin.com/",
  hours: "Monday to Saturday, 8am to 8pm (WAT)",
  description: "Personal concierge and lifestyle solutions for individuals, families and businesses in Nigeria. Tell us what you need and we’ll get it sorted.",
};

const home = async () => ({
  _id: "homePage", _type: "homePage",
  heroHeading: "Life is busy.\nLet us get it sorted.", heroButton: "See what we sort",
  heroImage: await img("market", "A smiling woman shopping at a busy produce market", [0.5, 0.35]),
  offerLabel: "What we offer", offerHeading: "We’re your personal concierge",
  offerIntro: "Sorted by Us handles life’s to-do list for individuals, families and businesses. We take on the calls, the suppliers and the chasing, and you get one clear quote, our fee included, before anything goes ahead.",
  catchallLabel: "Not on the list?", catchallHeading: "Something else?",
  catchallBody: "Tell us what you need. If it can be found, booked, bought or arranged, we love finding solutions.", catchallButton: "Make a request",
  catchallImage: await img("something-else", "A bright hotel lobby with lounge chairs and plants"),
  examplesLabel: "Just ask", examplesHeading: "Big or small, we’ll sort it",
  examples: items([
    { _type: "example", label: "Errands", text: "Collect my mum’s prescription in Surulere today" },
    { _type: "example", label: "Gifts", text: "A surprise hamper delivered to Ikoyi by 6pm", image: await img("gift-bed", "A wrapped gift with a satin bow") },
    { _type: "example", label: "Sourcing", text: "A replacement charger for a 2019 MacBook" },
    { _type: "example", label: "Travel", text: "Airport pickup for my parents landing Friday", image: await img("airport-pickup", "Travellers being met at arrivals") },
    { _type: "example", label: "Home", text: "A plumber who can come today" },
    { _type: "example", label: "Events", text: "A private dinner for 12, next Saturday", image: await img("dinner-flowers", "A dinner table laid with flowers") },
    { _type: "example", label: "Admin", text: "Renew my car papers while I’m abroad" },
    { _type: "example", label: "Shopping", text: "Fresh produce for the week, delivered", image: await img("market", "A woman shopping at a produce market") },
    { _type: "example", label: "Celebrations", text: "Balloons and a cake for a fifth birthday" },
    { _type: "example", label: "Family", text: "Someone to check on Dad’s house in Abuja", image: await img("father-daughter", "A father hugging his laughing daughter") },
  ]),
  processHeading: "How we get it sorted",
  processSteps: items([
    { _type: "step", title: "Ask", body: "Send us a request on the website or WhatsApp. Tell us what you need, where, when — and your budget. Add photos if they help.", image: await img("process-ask", "A woman typing a message on her phone", [0.5, 0.55]) },
    { _type: "step", title: "Find", body: "We review your request and source the right supplier, product or solution — often with a few options for you to choose from.", image: await img("process-find", "Two women going over notes together at a café table") },
    { _type: "step", title: "Arrange", body: "You get a clear quote including our fee. Once you approve it and pay by bank transfer, we coordinate everything.", image: await img("process-arrange", "A chef at work in a restaurant kitchen", [0.5, 0.4]) },
    { _type: "step", title: "Sorted", body: "We keep you updated until it’s delivered, done and closed. Consider it sorted.", image: await img("process-sorted", "A guest walking through a calm, warmly lit hotel lobby", [0.5, 0.82]) },
  ]),
  whoLabel: "Who we help", whoHeading: "Whoever you’re sorting for",
  whoIntro: "Your own to-do list, your family’s, or your company’s. Tell us what needs sorting and we’ll take it from there.",
  audiences: items([
    { _type: "audience", label: "For individuals", heading: "Your personal fixer, on call", button: "Make a request", body: "Tracking down a specific phone or part, a last-minute table, documents collected and delivered — tell us once and we take it from there. Most requests in Lagos are sorted the same day.", image: await img("woman-phone", "A woman smiling at her phone") },
    { _type: "audience", label: "For families", heading: "More time for the people who matter", button: "Make a request", body: "Birthday surprises, household help, movers and repairs — we handle the logistics so family life runs smoother. And if you live abroad, we’ll sort things for parents and family back home.", image: await img("father-daughter", "A father hugging his laughing daughter") },
  ]),
  corpLabel: "Corporate services", corpHeading: "A concierge desk\nfor your company",
  corpBody: "Travel, sourcing, client gifts, events and staff concierge, all handled by one team. On retainer, per request or per project.",
  corpButton: "Discuss a corporate solution",
  corpImage: await img("corporate-team", "A team in a meeting around a conference table", [0.56, 0.62]),
  faqHeading: "Good to know",
  faqs: faq([
    ["How much does it cost?", "Every request is quoted individually: the cost of the item or service, plus our sourcing and coordination fee. You approve it before anything goes ahead — no surprises."],
    ["How do I pay?", "Payments are made offline. Once you approve a quote we send an invoice and you pay by bank transfer. We never ask for card details on the website."],
    ["How quickly can you help?", "Most everyday requests in Lagos are handled the same or next day. Bigger or imported items take longer — we’ll always give you a realistic timeline with your quote."],
    ["Where do you work?", "We’re based in Lagos — Island, Mainland and Lekki — with same-day help for most everyday requests. We’re also on the ground across Abuja, and can help elsewhere in Nigeria by arrangement. If you’re abroad, we’ll sort things at home for you and your family."],
    ["Can I make a request from abroad?", "Yes. Many of our clients live outside Nigeria and use us to sort things for family at home. We’ll keep you updated on WhatsApp, whatever your time zone."],
    ["Can I send photos of what I need?", "Yes — attach photos to your request or send them on WhatsApp. It’s often the quickest way to show us exactly what you’re after."],
  ]),
  closingHeading: "Consider it sorted.", closingButton: "Make a request",
  closingImage: await img("couch-popcorn", "Two people relaxing on a sofa with a bowl of popcorn"),
});

const svc = [
  {
    slug: "shopping-sourcing", title: "Shopping & Sourcing", short: "shopping", heroHeading: "The exact thing, found for you",
    intro: "Tell us what you’re after. We’ll track it down here or abroad, check it’s genuine and get it to your door.",
    tile: ["The exact phone, part, fabric or furniture, found here or abroad", "shopping-fabrics", "A rail of bold printed fabrics on wooden hangers"],
    hero: ["printed-shirt", "Close-up of a printed shirt with embroidered trim"], side: ["clothes-rack", "A clothes rail in a boutique"],
    offers: [["Phones and electronics", "The right model, part or charger, checked before it’s bought."], ["Fabric and fashion", "Aso-ebi, lace and tailoring sourced to your spec and colour."], ["Furniture and fittings", "Pieces for the home or office, found, delivered and assembled."], ["Groceries and essentials", "Weekly shops and market runs, delivered fresh."], ["Imported items", "Bought abroad, shipped and cleared, with one price up front."], ["Hard-to-find things", "The discontinued, the specific, the ‘I’ve looked everywhere’."]],
    examples: [["Electronics", "A replacement charger for a 2019 MacBook"], ["Fabric", "Six yards of navy lace for a wedding in March"], ["Groceries", "Fresh produce for the week, delivered to Lekki"], ["Imports", "A standing desk shipped from the UK"], ["Furniture", "A dining set for eight, delivered and assembled"], ["Fashion", "The same shirt a size up, before Friday"], ["Car parts", "A side mirror for a 2015 Corolla"], ["Baby", "A car seat and pram we can trust"]],
    faqs: [["Can you buy from abroad?", "Yes. We buy from trusted sellers overseas, handle shipping and clearing, and quote the full landed cost before you pay."], ["How do I know it’s genuine?", "We check items before buying and send you photos. If it isn’t right, we don’t buy it."], ["Can I send a photo of what I want?", "Please do. A photo or link is the quickest way to show us exactly what you’re after."]],
  },
  {
    slug: "gifts-celebrations", title: "Gifts & Celebrations", short: "a gift", heroHeading: "Surprises, planned and delivered",
    intro: "Birthdays, anniversaries and thank-yous. Tell us who it’s for and your budget, and we’ll handle the rest.",
    tile: ["Flowers, cakes and hampers, planned and delivered as a surprise", "gift-bed", "A wrapped gift with a satin bow"],
    hero: ["dinner-flowers", "A celebration table laid with flowers"], side: ["birthday-girl", "A girl smiling at her birthday cake"], closing: ["couch-popcorn", "Two people relaxing on a sofa with a bowl of popcorn"],
    offers: [["Flowers and cakes", "Fresh bouquets and custom cakes from bakers and florists we trust."], ["Hampers", "Curated or made to order, for families, friends and clients."], ["Same-day delivery", "Most Lagos gifts delivered the same day, timed to the minute."], ["Party set-ups", "Balloons, décor and a cake, set up before the guest of honour arrives."], ["Gifts from abroad", "Living overseas? We’ll make sure the surprise lands at home."], ["Corporate gifting", "Branded gifts for clients and staff, delivered across Nigeria."]],
    examples: [["Flowers", "Flowers for my mum in Abuja on Sunday"], ["Anniversary", "Dinner and flowers for our tenth anniversary"], ["Corporate", "Thank-you gifts for 40 clients in December"], ["Hampers", "A surprise hamper delivered to Ikoyi by 6pm"], ["From abroad", "A birthday gift for my sister in Lagos, sent from London"], ["Birthdays", "Balloons and a cake for a fifth birthday"], ["Baby shower", "Gifts and décor for a baby shower"], ["Graduation", "A cake and a photographer for a graduation"]],
    faqs: [["How late can I order for the same day?", "For most Lagos deliveries, message us by noon. We’ll tell you straight away if it’s possible."], ["Can you add a personal note?", "Yes. Send us the message and we’ll include a handwritten card."], ["Will you send a photo when it’s delivered?", "Always, so you can see it arrived as planned."]],
  },
  {
    slug: "travel-holidays", title: "Travel & Holidays", short: "travel", heroHeading: "Booked, arranged and met at arrivals",
    intro: "Flights, hotels and the transfers in between, arranged around you, with someone on the ground when you land.",
    tile: ["Flights, hotels and airport pickups, booked and arranged", "airport-desk", "Travellers with luggage at an airport check-in desk"],
    hero: ["airport-pickup", "Travellers being met at arrivals"], side: ["airport-desk", "Travellers at an airport check-in desk"],
    offers: [["Flights", "The best routes and fares, booked and changed when plans change."], ["Hotels and stays", "Hotels, short lets and serviced apartments that match the photos."], ["Airport pickups", "A driver waiting at arrivals, tracking your flight."], ["Getaways", "Weekend breaks and holidays, planned door to door."], ["Visa appointments", "Forms, bookings and documents organised, so nothing’s missed."], ["Family travel", "Parents flying in? We’ll meet them and get them home."]],
    examples: [["Hotels", "A quiet hotel in Abuja for three nights"], ["Pickups", "Airport pickup for my parents landing Friday"], ["Getaways", "A long weekend in Accra for two"], ["Drivers", "A driver for the week while I’m in Lagos"], ["Visas", "Help booking a visa appointment"], ["Flights", "Return flights to London in August"], ["Family", "Flights and a hotel for six at Christmas"], ["Last minute", "A room near the airport tonight"]],
    faqs: [["Do you charge more than booking myself?", "You pay the fare plus our fee, shown clearly in the quote. We often find better options than you’d see yourself."], ["What if my flight is delayed?", "We track it and update your driver, so they’re there when you land."], ["Can you help with visas?", "We organise appointments and paperwork. The decision rests with the embassy."]],
  },
  {
    slug: "errands-admin", title: "Errands & Admin", short: "an errand", heroHeading: "The queues and paperwork, handled",
    intro: "The errands that eat a whole day. We collect, drop off, pay and renew, and send you proof when it’s done.",
    tile: ["Documents, payments and queues, handled for you", "scooter", "A delivery rider on a scooter at night"],
    hero: ["scooter", "A rider on a scooter at night"], side: ["office", "A bright, quiet office"],
    offers: [["Collections and drop-offs", "Documents, parcels and keys, picked up and delivered across the city."], ["Bills and payments", "Utility bills, school fees and levies paid, with receipts sent."], ["Car papers", "Licences, insurance and roadworthiness renewed before they lapse."], ["Prescriptions", "Collected from the pharmacy and brought to the door."], ["Queues and offices", "We stand in line so you don’t have to."], ["Admin from abroad", "Paperwork at home, sorted while you’re away."]],
    examples: [["Pharmacy", "Collect my mum’s prescription in Surulere today"], ["Parcels", "Pick up a parcel from the courier in Ikeja"], ["Car papers", "Renew my car papers while I’m abroad"], ["Bills", "Pay the estate service charge and send the receipt"], ["Queues", "Stand in line at the passport office for me"], ["Documents", "Drop signed documents at my lawyer’s office"], ["Banking", "Collect a new card from my bank branch"], ["Market run", "A weekly market run for my parents"]],
    faqs: [["How do I know it’s done?", "We send photos, receipts or a signed copy, whatever proves it."], ["Can you handle official documents?", "Yes, with your written authorisation where an office needs it."], ["Can I set up regular errands?", "Yes. Weekly or monthly errands can be booked once and handled on repeat."]],
  },
  {
    slug: "home-lifestyle", title: "Home & Lifestyle", short: "home help", heroHeading: "The right people, at the door",
    intro: "Help for the house, booked and followed up, so you’re not chasing anyone for a quote or a time.",
    tile: ["The right people for repairs, moves, cleaning and household help", "home-living", "A bright, lived-in living room with a cream sofa and timber beams"],
    hero: ["home-living", "A bright living room with a cream sofa"], side: ["tomatoes", "Fresh tomatoes being rinsed at a kitchen sink"],
    offers: [["Repairs", "Plumbers, electricians and handymen who turn up when they say."], ["Moves", "Packing, movers and set-up at the other end."], ["Cleaning", "One-off deep cleans or regular help, arranged and checked."], ["Household staff", "Help finding drivers, cooks and housekeepers."], ["Home checks", "Someone to check on a family house while you’re away."], ["Generators and solar", "Servicing, fuel and installers, booked and followed up."]],
    examples: [["Repairs", "A plumber who can come today"], ["House checks", "Someone to check on Dad’s house in Abuja"], ["Moves", "Movers for a two-bed flat next Saturday"], ["Cleaning", "A deep clean before guests arrive"], ["Power", "An electrician to fix the inverter"], ["Household help", "A reliable cook three days a week"], ["Outdoors", "Someone to sort out the overgrown compound"], ["Fittings", "Curtains measured and hung in the new flat"]],
    faqs: [["Are your contractors vetted?", "We use people we’ve worked with before and check every job is finished properly."], ["Who do I pay?", "You pay us. We pay the contractor once the job is done."], ["What if something goes wrong?", "Tell us and we’ll get it put right. That’s the point of having us in the middle."]],
  },
  {
    slug: "events-experiences", title: "Events & Experiences", short: "an event", heroHeading: "From a table for two to the whole event",
    intro: "Reservations, private dinners and celebrations, booked and run on the day so you can enjoy it.",
    tile: ["From a last-minute table to a whole event, booked and run", "events-table", "An event table laid with wine glasses, cutlery and a bottle of red"],
    hero: ["events-table", "An event table laid for dinner"], side: ["dancing-woman", "An older woman dancing at a street party", [0.5, 0]],
    offers: [["Reservations", "The table you want, including the last-minute ones."], ["Private dinners", "A chef at home for an evening, menu and all."], ["Celebrations", "Birthdays, anniversaries and engagements, planned around you."], ["Venues and suppliers", "Venues, décor, catering and music, sourced and coordinated."], ["On the day", "Someone on site so it runs on time and you don’t have to."], ["Tickets and experiences", "Concerts, shows and days out, booked for you."]],
    examples: [["Tables", "A table at a rooftop spot tonight"], ["Dinners", "A private dinner for 12, next Saturday"], ["Days out", "A beach day for the family in Ilashe"], ["Proposals", "An engagement surprise with flowers and a photographer"], ["Tickets", "Two tickets for the concert on Friday"], ["Parties", "A street party for Mum’s 80th"], ["Chefs", "A chef for a family lunch on Sunday"], ["Décor", "Flowers and lighting for an outdoor dinner"]],
    faqs: [["How much notice do you need?", "For reservations, a few hours can be enough. Bigger events are best with a few weeks."], ["Do you plan weddings?", "We help with parts of a wedding, like suppliers and logistics, rather than full planning."], ["Can you stay within a budget?", "Yes. Tell us the budget and we’ll plan to it, showing every cost in the quote."]],
  },
];

async function serviceDoc(s, i) {
  const heroImage = await img(s.hero[0], s.hero[1]);
  const sideImage = await img(s.side[0], s.side[1], s.side[2]);
  return {
    _id: `service-${s.slug}`, _type: "service", title: s.title, slug: { _type: "slug", current: s.slug }, order: i + 1, short: s.short,
    tileSummary: s.tile[0], tileImage: await img(s.tile[1], s.tile[2]),
    heroHeading: s.heroHeading, intro: s.intro, heroImage,
    offers: titled(s.offers),
    // photo cards where the site had them: 2nd card = main photo, 6th = side photo
    examples: items(s.examples.map(([label, text], j) => ({ _type: "example", label, text, ...(j === 1 ? { image: heroImage } : j === 5 ? { image: sideImage } : {}) }))),
    sideImage, faqs: faq(s.faqs),
    ...(s.closing ? { closingImage: await img(s.closing[0], s.closing[1]) } : {}),
  };
}

const how = async () => ({
  _id: "howItWorksPage", _type: "howItWorksPage",
  heroHeading: "One message.\nWe handle the rest.", heroIntro: "Tell us what you need. We find it, quote it, arrange it and keep you posted until it’s done.",
  heroImage: await img("laptop-typing", "Hands typing a message on a laptop", [0.5, 0.8]),
  stepsLabel: "Four steps", stepsHeading: "From your message to done", stepsIntro: "Every request goes the same way, so you always know what happens next and who’s doing it.",
  steps: items([
    { _type: "step", title: "Ask", summary: "One message is all it takes.", you: "Tell us what you need on WhatsApp or the website: what, where, when and your budget. Photos and links help.", we: "Read it, ask anything we need to know, and confirm we can help.", timing: "We reply within [reply time], [working hours].", image: await img("woman-texting", "A woman typing a message on her phone") },
    { _type: "step", title: "Find", summary: "We do the searching, so you don’t have to.", you: "Nothing. No calls to make, no shops to visit.", we: "Take it to suppliers we know, compare prices and quality, and come back with the best options.", timing: "[Typical time to options, e.g. same day for everyday requests.]", image: await img("man-tablet-window", "A man going through options on a tablet by an office window") },
    { _type: "step", title: "Arrange", summary: "One clear quote. Nothing goes ahead until you say yes.", you: "Pick an option, approve the quote and pay by bank transfer.", we: "Send one quote with every cost and our fee, then buy, book and arrange it.", timing: "[When payment is due, e.g. in full before we buy.]", image: await img("till-screen", "A hand tapping an order into a till screen") },
    { _type: "step", title: "Sorted", summary: "Delivered, done and closed.", you: "Receive it, or hear that it’s done.", we: "Collect, check and deliver it, keep you posted on WhatsApp, and send photos and receipts at the end.", timing: "Updates at every step until it’s closed.", image: await img("man-reading", "A man relaxing at home with a book") },
  ]),
  behindLabel: "Behind the scenes", behindHeading: "You send one message. We deal with everyone else.",
  behindPoints: titled([["Compare", "We check more than one supplier for price, quality and availability."], ["Check", "We use people we’ve worked with before, and vet new ones before we do."], ["Buy", "We agree the price, pay the supplier and handle the paperwork."], ["Deliver", "We collect it, check it, and get it to you or wherever it needs to go."]]),
  costsLabel: "Costs and payment", costsHeading: "Clear costs, before anything happens",
  costs: titled([["How our fee works", "[Fee model: e.g. a flat fee per request, or a percentage of the cost.] It’s always its own line on your quote, never hidden in the price."], ["When you pay", "[Payment timing: e.g. in full before we buy, or a deposit for larger orders.] Nothing is bought or booked until you’ve approved the quote."], ["Paying from abroad", "[How clients outside Nigeria pay: currencies accepted and account details.]"], ["Receipts for everything", "You get the supplier’s receipt and photos of what we bought on your behalf. We never ask for card details on the website."]]),
  wrongLabel: "Our promise", wrongHeading: "If something goes wrong", wrongIntro: "Plans change and suppliers slip. Here’s what happens when they do.",
  wrong: titled([["You change your mind", "Before you approve the quote, there’s nothing to cancel. After that, we’ll tell you what can still be stopped and what it would cost. [Confirm cancellation policy.]"], ["Something arrives wrong or damaged", "Tell us within [time window] and we’ll arrange a return, replacement or refund with the supplier. [Confirm returns approach.]"], ["A supplier lets us down", "We find another option at no extra fee, or refund what you’ve paid for that part of the request. [Confirm.]"], ["What we won’t take on", "Anything illegal or unsafe. If we can’t help, we’ll say so straight away rather than leave you waiting."]]),
  faqs: faq([["How quickly can you help?", "Most everyday requests in Lagos are handled the same or next day. Bigger or imported items take longer, and we’ll always give you a realistic timeline with your quote. [Confirm timings.]"], ["Can I make a request from abroad?", "Yes. Many of our clients live outside Nigeria and use us to sort things for family at home. We’ll keep you updated on WhatsApp, whatever your time zone."], ["What do you do with my details?", "We only use them to sort your request, and only share what a supplier needs, like a delivery address. Our privacy policy has the full details."], ["Do I need an account?", "No. Just send a message on WhatsApp or through the website."]]),
  closingHeading: "Ready when you are.", closingImage: await img("beach-family", "A family playing together on the beach"),
  seoDescription: "One message and we handle the rest: how we find, quote, arrange and deliver your request.",
});

const corp = async () => ({
  _id: "corporatePage", _type: "corporatePage",
  heroHeading: "A concierge desk\nfor your company", heroIntro: "Travel, sourcing, client gifts, events and staff concierge, all handled by one team.",
  heroImage: await img("team-table", "A team meeting around a table", [0.5, 0.8]), ctaLabel: "Discuss a corporate solution",
  offersLabel: "What we handle", offersHeading: "One team for the jobs no one owns", offersIntro: "The requests that fall between departments, picked up, quoted and closed for you.",
  offers: items([
    { _type: "offer", title: "Travel & accommodation", body: "Flights, hotels, drivers and airport meet-and-greet for staff and visiting clients, booked to your travel policy.", items: ["Flights, hotels and transfers", "Visitor and client arrivals", "Changes handled on the day"], image: await img("airport-desk", "Travellers at an airport check-in desk") },
    { _type: "offer", title: "Procurement & sourcing", body: "Office equipment, one-off purchases and hard-to-find items, sourced, compared and delivered with a clear paper trail.", items: ["Quotes from checked suppliers", "One invoice per request", "Delivery to any office"], image: await img("office", "A bright, quiet office") },
    { _type: "offer", title: "Gifts & hampers", body: "Festive hampers, thank-you gifts and milestone celebrations, branded if you like and delivered across Nigeria.", items: ["Seasonal and bulk orders", "Branded packaging", "Delivered to every address"], image: await img("biscuits", "Hands packing biscuits into bags from a tray") },
    { _type: "offer", title: "Events & meetings", body: "Venues, catering, suppliers and on-the-day coordination for meetings and company events of any size.", items: ["Venues and catering", "Supplier coordination", "Someone on site on the day"], image: await img("cucumber-chopping", "A chef slicing cucumber on a chopping board") },
  ]),
  peopleLabel: "And for your people", peopleHeading: "Support beyond the office",
  people: items([
    { _type: "item", title: "Employee concierge", body: "A perk your staff will actually use: errands, bookings and home admin, sorted for them so they can focus at work.", image: await img("plant-care", "Someone misting houseplants at home") },
    { _type: "item", title: "Admin & lifestyle support", body: "Help for executives with the personal admin that eats into their week, from renewals and repairs to school runs and reservations.", image: await img("man-desk", "A man working at a laptop in a plant-filled home office") },
    { _type: "item", title: "Special requests", body: "The unusual ones. If it can be found, booked or arranged, ask, and we’ll tell you honestly what’s possible.", image: await img("tablet-art", "A woman photographing framed prints with a tablet") },
    { _type: "item", title: "One point of contact", body: "One person who knows your account, on WhatsApp and email, with every request tracked and invoiced in one place.", showButton: true, image: await img("window-chat", "Two colleagues talking by an office window") },
  ]),
  modelsLabel: "Ways to work with us", modelsHeading: "Pick what suits your team", modelsIntro: "Start per request and move to a retainer when it makes sense. Every option comes with a clear quote.",
  models: items([
    { _type: "model", title: "Per request", body: "Use us when you need us. Each request is quoted on its own, our fee included.", bestFor: "Best for occasional needs" },
    { _type: "model", title: "Per project", body: "A fixed quote for something bigger, like an offsite, a relocation or a gifting campaign.", bestFor: "Best for one-off projects" },
    { _type: "model", title: "Retainer", body: "A monthly concierge desk for your team, with an agreed number of requests and a named contact.", bestFor: "Best for ongoing support" },
  ]),
  faqs: faq([["How do you invoice companies?", "We invoice your company for each request, or monthly on a retainer, and you pay by bank transfer. We can work with your purchase order process."], ["Can staff make requests directly?", "Yes. On a retainer, named staff can message us directly and we bill the company within the limits you set."], ["Do you work outside Lagos?", "We’re based in Lagos and on the ground in Abuja, and can arrange things elsewhere in Nigeria."]]),
  closingHeading: "Let’s talk about your team.", closingImage: await img("team-meeting", "Colleagues smiling in a team meeting", [0.5, 0.45]),
  seoDescription: "Concierge support for companies in Nigeria: travel, procurement, client gifts, events and employee concierge.",
});

const block = (children) => ({ _type: "block", _key: key(), style: "normal", markDefs: [], children: children.map(([text, marks = []]) => ({ _type: "span", _key: key(), text, marks })) });
const about = async () => ({
  _id: "aboutPage", _type: "aboutPage",
  heroHeading: "Who is\nSorted by Us?", heroIntro: "A Nigerian personal concierge and solutions company for individuals, families and businesses.",
  heroImage: await img("kaftan-garden", "A man in a white kaftan fastening his cuff in a leafy garden"),
  storyLabel: "Our story", storyHeading: "Started by someone who was always asked to sort it",
  story: [
    block([["Every family has one person who knows who to call.", ["strong"]], [" The one who finds the part, books the table, gets the papers renewed and checks on the house when everyone else is away."]]),
    block([["Sorted by Us turns that person into a service. We take on the calls, the suppliers and the chasing for people in Lagos, Abuja and abroad, so the things on your list actually get done."]]),
    block([["We started in Nigeria because that’s where we know how things work, who to trust and how to get it done properly. Over time, we want to sort things for our clients wherever they are."]]),
  ],
  valuesLabel: "What we stand for", valuesHeading: "We don’t do anything by half",
  values: items([
    { _type: "value", title: "Resourceful", body: "If it can be found, booked, bought or arranged, we’ll find a way, or tell you honestly that we can’t. We know the markets, the suppliers and who to call.", buttonLabel: "What we sort", buttonLink: "/#offer", image: await img("butcher-market", "A trader at work on a busy market stall") },
    { _type: "value", title: "Transparent", body: "You tell us what you need and get one clear quote with our fee included, before anything goes ahead. No forms to chase, no surprise costs.", buttonLabel: "How it works", buttonLink: "/how-it-works", image: await img("woman-phone", "A woman smiling at her phone") },
    { _type: "value", title: "Personal", body: "One person handles your request from start to finish, and knows you, your family and your preferences the next time you ask.", image: await img("sisters-reading", "Two sisters reading a picture book on the sofa") },
    { _type: "value", title: "Reliable", body: "We keep you posted on WhatsApp until it’s delivered, done and closed, whether you’re in Lagos or on the other side of the world.", buttonLabel: "Make a request", buttonLink: "/contact", image: await img("man-phone", "A man reading an update on his phone") },
  ]),
  whereLabel: "Where we work", whereHeading: "On the ground in Lagos and Abuja",
  whereList: ["Lagos: Island, Mainland and Lekki, with same-day help for most requests", "Abuja: across the city", "Elsewhere in Nigeria by arrangement", "From abroad: we sort things at home for you and your family"],
  whereImage: await img("fish-basket", "A woman at the water’s edge with a basket of fresh fish"),
  closingImage: await img("yoga-shore", "A woman holding a yoga pose on rocks by the sea", [0.5, 0.18]),
  seoDescription: "Who we are: a Nigerian personal concierge and solutions company for individuals, families and businesses.",
});

const contact = async () => ({
  _id: "contactPage", _type: "contactPage",
  heroHeading: "Talk to\na person", heroIntro: "Message us on WhatsApp, send an email or use the form. We usually reply within the hour during the day.",
  heroImage: await img("bench", "A man sitting on a bench under a bridge"),
  formLabel: "Get in touch", formHeading: "Send us a message", formIntro: "Tell us what you need sorted, or ask us anything. Or reach us directly:",
  seoDescription: "Message us on WhatsApp, send an email or use the form. Tell us what you need sorted.",
});

const sections = (arr) => items(arr.map(([heading, body]) => ({ _type: "section", heading, body })));
const legal = [
  { _id: "legal-privacy", _type: "legalPage", title: "Privacy policy", seoDescription: "How Sorted by Us collects, uses and protects your personal information.", sections: sections([["Who we are", "Sorted by Us is a personal concierge and solutions company based in Lagos, Nigeria. This policy explains what we collect when you use our website or contact us, and how we use it."], ["What we collect", "Your name, phone or WhatsApp number and email; the details of your request, including any photos you send; and where you’d like things delivered or arranged."], ["How we use it", "Only to handle your request: to contact you, prepare a quote, arrange the work with suppliers and keep you updated. We don’t sell your details."], ["Who we share it with", "The suppliers needed to complete your request, and only what they need. We never ask for card details on the website."], ["How long we keep it", "For as long as we need to complete your request and meet our legal and accounting obligations."], ["Your rights", "You can ask to see, correct or delete the information we hold about you by emailing hello@sortedbyus.com."]]) },
  { _id: "legal-terms", _type: "legalPage", title: "Terms of service", seoDescription: "The terms that apply when you use Sorted by Us.", sections: sections([["Our service", "We find, arrange and coordinate products and services on your behalf. Many are provided by third-party suppliers, and we’ll always tell you who."], ["Quotes and fees", "Every request is quoted individually: the cost of the item or service plus our sourcing and coordination fee. Nothing goes ahead until you approve the quote."], ["Payment", "Payments are made offline. We send an invoice and you pay by bank transfer before we buy or book anything."], ["Changes and cancellations", "Until you approve a quote there’s nothing to cancel. After that, we’ll tell you what can still be stopped and any costs that can’t be recovered."], ["Requests from abroad", "We can act for you in Nigeria while you’re overseas. Some requests may need extra checks or documents."], ["Contact", "Questions about these terms: hello@sortedbyus.com."]]) },
];

const docs = [site, await home(), ...(await Promise.all(svc.map(serviceDoc))), await how(), await corp(), await about(), await contact(), ...legal];
const tx = client.transaction();
for (const d of docs) tx.createOrReplace(d);
await tx.commit();
console.log(`\nimported ${docs.length} documents, ${assets.size} photos`);
