/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck -- archived design (not a route); still uses the pre-Sanity local photos
import { ButtonLink } from "@/components/ui/Button";
import CutBanner from "@/components/ui/CutBanner";
import Accordion from "@/components/ui/Accordion";
import PageHero from "@/components/sections/PageHero";
import SectionIntro from "@/components/sections/SectionIntro";
import Closing from "@/components/sections/Closing";
import Footer from "@/components/layout/Footer";
import Bento from "@/components/sections/Bento";
import { serviceList } from "@/components/sections/serviceData";
import h from "@/styles/home.module.css";
import d from "@/styles/pages.module.css";

import clothesRack from "@/assets/home/clothes-rack.jpg";
import shoppingFabrics from "@/assets/home/shopping-fabrics.jpg";
import giftBed from "@/assets/home/gift-bed.jpg";
import airportDesk from "@/assets/home/airport-desk.jpg";
import scooter from "@/assets/home/scooter.jpg";
import homeLiving from "@/assets/home/home-living.jpg";
import eventsTable from "@/assets/home/events-table.jpg";
import somethingElse from "@/assets/home/something-else.jpg";
import couchPopcorn from "@/assets/home/couch-popcorn.jpg";

const categories = [
  {
    title: "Shopping & Sourcing",
    heading: "The exact thing, found for you",
    body: "Tell us what you’re after and we’ll track it down, here or abroad, check it’s the real thing and get it to your door.",
    items: ["Phones, laptops, parts and chargers", "Fabric, furniture and fittings", "Groceries and weekly essentials", "Imported and hard-to-find items"],
    img: shoppingFabrics,
    alt: "A rail of bold printed fabrics on wooden hangers",
  },
  {
    title: "Gifts & Celebrations",
    heading: "Surprises, planned and delivered",
    body: "Birthdays, anniversaries, thank-yous. Tell us who it’s for and your budget, and we’ll handle the idea, the order and the delivery.",
    items: ["Flowers, cakes and hampers", "Same-day gift delivery in Lagos", "Balloons and party set-ups", "Gifts sent home from abroad"],
    img: giftBed,
    alt: "A wrapped gift with a satin bow",
  },
  {
    title: "Travel & Holidays",
    heading: "Booked, arranged and met at arrivals",
    body: "Flights, hotels and the transfers in between, arranged around you, with someone on the ground when you land.",
    items: ["Flights and hotel bookings", "Airport pickups and drivers", "Short breaks and getaways", "Visa appointment support"],
    img: airportDesk,
    alt: "Travellers with luggage at an airport check-in desk",
  },
  {
    title: "Errands & Admin",
    heading: "The queues and paperwork, handled",
    body: "The errands that eat a whole day. We collect, drop off, pay and renew, and send you proof when it’s done.",
    items: ["Document collection and delivery", "Bill payments and renewals", "Car papers and licences", "Prescriptions and pickups"],
    img: scooter,
    alt: "A delivery rider on a scooter at night",
  },
  {
    title: "Home & Lifestyle",
    heading: "The right people, at the door",
    body: "Vetted help for the house, booked and followed up, so you’re not chasing anyone for a quote or a time.",
    items: ["Plumbers, electricians and repairs", "Moves and deliveries", "Cleaning and household help", "Checks on a family home"],
    img: homeLiving,
    alt: "A bright, lived-in living room with a cream sofa and timber beams",
  },
  {
    title: "Events & Experiences",
    heading: "From a table for two to the whole event",
    body: "Reservations, private dinners and celebrations, booked and run on the day so you can enjoy it.",
    items: ["Restaurant and last-minute bookings", "Private dinners and chefs", "Venues, décor and suppliers", "Tickets and experiences"],
    img: eventsTable,
    alt: "An event table laid with wine glasses, cutlery and a bottle of red",
  },
];

const faqs = [
  { q: "Is there anything you won’t do?", a: "We won’t take on anything illegal or unsafe. If we can’t help, we’ll say so straight away rather than leave you waiting." },
  { q: "How much does it cost?", a: "Every request is quoted individually: the cost of the item or service, plus our sourcing and coordination fee. You approve it before anything goes ahead." },
  { q: "Can I combine requests?", a: "Yes. Send them together and we’ll quote them as one, with a single fee where it makes sense." },
];

export default function ServicesPage() {
  return (
    <>
      <PageHero
        label="What we offer"
        title={<>Whatever’s on<br />your list</>}
        intro="Six things we sort every day, and anything else you can think of. One request, one clear quote."
        image={clothesRack}
        alt="A clothes rail in a bright boutique"
      />
      <main>
        <section className={d.section} aria-labelledby="cats-heading">
          <SectionIntro
            id="cats-heading"
            label="Our services"
            title="Six ways we get it sorted"
            intro="Each request is handled end to end by one person on our team, from the first message to the final update."
          />
          <Bento items={categories.map((c, i) => ({ title: c.title, body: c.body, img: c.img, alt: c.alt, href: `/services/${serviceList[i].slug}` }))} />
        </section>

        <section className={h.catchall} aria-labelledby="else-heading">
          <CutBanner as="div" base={somethingElse} tone="var(--olive)" mirror align="start" className={h.catchallInner}>
            <div className={h.catchallCopy}>
              <div>
                <p className={h.label}>Not on the list?</p>
                <h2 id="else-heading" className={`${h.panelHeading} ${h.subHeading}`}>Something else?</h2>
              </div>
              <div className={h.catchallSide}>
                <p className={h.catchallBody}>Tell us what you need. If it can be found, booked, bought or arranged, we love finding solutions.</p>
                <ButtonLink href="/contact" className={h.oliveBtn}>Make a request</ButtonLink>
              </div>
            </div>
          </CutBanner>
        </section>

        <section className={`${h.faq} ${h.who}`} style={{ paddingTop: 120 }} aria-labelledby="faq-heading">
          <h2 id="faq-heading" className={`${h.h2} ${h.subHeading}`}>Good to know</h2>
          <Accordion items={faqs} defaultOpen={0} />
        </section>

        <Closing image={couchPopcorn} />
      </main>
      <Footer />
    </>
  );
}
