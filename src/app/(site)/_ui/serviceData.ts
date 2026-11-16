import type { StaticImageData } from "next/image";
import clothesRack from "@/assets/home/clothes-rack.jpg";
import tomatoes from "@/assets/home/tomatoes.jpg";
import dancingWoman from "@/assets/home/dancing-woman.jpg";
import birthdayGirl from "@/assets/home/birthday-girl.jpg";
import printedShirt from "@/assets/home/printed-shirt.jpg";
import dinnerFlowers from "@/assets/home/dinner-flowers.jpg";
import couchPopcorn from "@/assets/home/couch-popcorn.jpg";
import airportDesk from "@/assets/home/airport-desk.jpg";
import airportPickup from "@/assets/home/airport-pickup.jpg";
import scooter from "@/assets/home/scooter.jpg";
import office from "@/assets/home/office.jpg";
import homeLiving from "@/assets/home/home-living.jpg";
import eventsTable from "@/assets/home/events-table.jpg";

export type Service = {
  slug: string;
  title: string;
  short: string; // verb used in buttons: "Request shopping"
  heroTitle: string;
  intro: string;
  hero: StaticImageData;
  heroAlt: string;
  side: StaticImageData;
  sideAlt: string;
  /** object-position for the side photo where the subject isn't centred. */
  sidePos?: string;
  /** closing banner photo, where the default would repeat the hero */
  closing?: StaticImageData;
  offer: { title: string; body: string }[];
  examples: { label: string; text: string }[];
  faqs: { q: string; a: string }[];
};

export const serviceList: Service[] = [
  {
    slug: "shopping-sourcing", title: "Shopping & Sourcing", short: "shopping", heroTitle: "The exact thing, found for you",
    intro: "Tell us what you’re after. We’ll track it down here or abroad, check it’s genuine and get it to your door.",
    hero: printedShirt, heroAlt: "Close-up of a printed shirt with embroidered trim", side: clothesRack, sideAlt: "A clothes rail in a boutique",
    offer: [
      { title: "Phones and electronics", body: "The right model, part or charger, checked before it’s bought." },
      { title: "Fabric and fashion", body: "Aso-ebi, lace and tailoring sourced to your spec and colour." },
      { title: "Furniture and fittings", body: "Pieces for the home or office, found, delivered and assembled." },
      { title: "Groceries and essentials", body: "Weekly shops and market runs, delivered fresh." },
      { title: "Imported items", body: "Bought abroad, shipped and cleared, with one price up front." },
      { title: "Hard-to-find things", body: "The discontinued, the specific, the ‘I’ve looked everywhere’." },
    ],
    examples: [{ label: "Electronics", text: "A replacement charger for a 2019 MacBook" }, { label: "Fabric", text: "Six yards of navy lace for a wedding in March" }, { label: "Groceries", text: "Fresh produce for the week, delivered to Lekki" }, { label: "Imports", text: "A standing desk shipped from the UK" }, { label: "Furniture", text: "A dining set for eight, delivered and assembled" }, { label: "Fashion", text: "The same shirt a size up, before Friday" }, { label: "Car parts", text: "A side mirror for a 2015 Corolla" }, { label: "Baby", text: "A car seat and pram we can trust" }],
    faqs: [
      { q: "Can you buy from abroad?", a: "Yes. We buy from trusted sellers overseas, handle shipping and clearing, and quote the full landed cost before you pay." },
      { q: "How do I know it’s genuine?", a: "We check items before buying and send you photos. If it isn’t right, we don’t buy it." },
      { q: "Can I send a photo of what I want?", a: "Please do. A photo or link is the quickest way to show us exactly what you’re after." },
    ],
  },
  {
    slug: "gifts-celebrations", title: "Gifts & Celebrations", short: "a gift", heroTitle: "Surprises, planned and delivered",
    intro: "Birthdays, anniversaries and thank-yous. Tell us who it’s for and your budget, and we’ll handle the rest.",
    hero: dinnerFlowers, heroAlt: "A celebration table laid with flowers", closing: couchPopcorn, side: birthdayGirl, sideAlt: "A girl smiling at her birthday cake",
    offer: [
      { title: "Flowers and cakes", body: "Fresh bouquets and custom cakes from bakers and florists we trust." },
      { title: "Hampers", body: "Curated or made to order, for families, friends and clients." },
      { title: "Same-day delivery", body: "Most Lagos gifts delivered the same day, timed to the minute." },
      { title: "Party set-ups", body: "Balloons, décor and a cake, set up before the guest of honour arrives." },
      { title: "Gifts from abroad", body: "Living overseas? We’ll make sure the surprise lands at home." },
      { title: "Corporate gifting", body: "Branded gifts for clients and staff, delivered across Nigeria." },
    ],
    examples: [{ label: "Flowers", text: "Flowers for my mum in Abuja on Sunday" }, { label: "Anniversary", text: "Dinner and flowers for our tenth anniversary" }, { label: "Corporate", text: "Thank-you gifts for 40 clients in December" }, { label: "Hampers", text: "A surprise hamper delivered to Ikoyi by 6pm" }, { label: "From abroad", text: "A birthday gift for my sister in Lagos, sent from London" }, { label: "Birthdays", text: "Balloons and a cake for a fifth birthday" }, { label: "Baby shower", text: "Gifts and décor for a baby shower" }, { label: "Graduation", text: "A cake and a photographer for a graduation" }],
    faqs: [
      { q: "How late can I order for the same day?", a: "For most Lagos deliveries, message us by noon. We’ll tell you straight away if it’s possible." },
      { q: "Can you add a personal note?", a: "Yes. Send us the message and we’ll include a handwritten card." },
      { q: "Will you send a photo when it’s delivered?", a: "Always, so you can see it arrived as planned." },
    ],
  },
  {
    slug: "travel-holidays", title: "Travel & Holidays", short: "travel", heroTitle: "Booked, arranged and met at arrivals",
    intro: "Flights, hotels and the transfers in between, arranged around you, with someone on the ground when you land.",
    hero: airportPickup, heroAlt: "Travellers being met at arrivals", side: airportDesk, sideAlt: "Travellers at an airport check-in desk",
    offer: [
      { title: "Flights", body: "The best routes and fares, booked and changed when plans change." },
      { title: "Hotels and stays", body: "Hotels, short lets and serviced apartments that match the photos." },
      { title: "Airport pickups", body: "A driver waiting at arrivals, tracking your flight." },
      { title: "Getaways", body: "Weekend breaks and holidays, planned door to door." },
      { title: "Visa appointments", body: "Forms, bookings and documents organised, so nothing’s missed." },
      { title: "Family travel", body: "Parents flying in? We’ll meet them and get them home." },
    ],
    examples: [{ label: "Hotels", text: "A quiet hotel in Abuja for three nights" }, { label: "Pickups", text: "Airport pickup for my parents landing Friday" }, { label: "Getaways", text: "A long weekend in Accra for two" }, { label: "Drivers", text: "A driver for the week while I’m in Lagos" }, { label: "Visas", text: "Help booking a visa appointment" }, { label: "Flights", text: "Return flights to London in August" }, { label: "Family", text: "Flights and a hotel for six at Christmas" }, { label: "Last minute", text: "A room near the airport tonight" }],
    faqs: [
      { q: "Do you charge more than booking myself?", a: "You pay the fare plus our fee, shown clearly in the quote. We often find better options than you’d see yourself." },
      { q: "What if my flight is delayed?", a: "We track it and update your driver, so they’re there when you land." },
      { q: "Can you help with visas?", a: "We organise appointments and paperwork. The decision rests with the embassy." },
    ],
  },
  {
    slug: "errands-admin", title: "Errands & Admin", short: "an errand", heroTitle: "The queues and paperwork, handled",
    intro: "The errands that eat a whole day. We collect, drop off, pay and renew, and send you proof when it’s done.",
    hero: scooter, heroAlt: "A rider on a scooter at night", side: office, sideAlt: "A bright, quiet office",
    offer: [
      { title: "Collections and drop-offs", body: "Documents, parcels and keys, picked up and delivered across the city." },
      { title: "Bills and payments", body: "Utility bills, school fees and levies paid, with receipts sent." },
      { title: "Car papers", body: "Licences, insurance and roadworthiness renewed before they lapse." },
      { title: "Prescriptions", body: "Collected from the pharmacy and brought to the door." },
      { title: "Queues and offices", body: "We stand in line so you don’t have to." },
      { title: "Admin from abroad", body: "Paperwork at home, sorted while you’re away." },
    ],
    examples: [{ label: "Pharmacy", text: "Collect my mum’s prescription in Surulere today" }, { label: "Parcels", text: "Pick up a parcel from the courier in Ikeja" }, { label: "Car papers", text: "Renew my car papers while I’m abroad" }, { label: "Bills", text: "Pay the estate service charge and send the receipt" }, { label: "Queues", text: "Stand in line at the passport office for me" }, { label: "Documents", text: "Drop signed documents at my lawyer’s office" }, { label: "Banking", text: "Collect a new card from my bank branch" }, { label: "Market run", text: "A weekly market run for my parents" }],
    faqs: [
      { q: "How do I know it’s done?", a: "We send photos, receipts or a signed copy, whatever proves it." },
      { q: "Can you handle official documents?", a: "Yes, with your written authorisation where an office needs it." },
      { q: "Can I set up regular errands?", a: "Yes. Weekly or monthly errands can be booked once and handled on repeat." },
    ],
  },
  {
    slug: "home-lifestyle", title: "Home & Lifestyle", short: "home help", heroTitle: "The right people, at the door",
    intro: "Help for the house, booked and followed up, so you’re not chasing anyone for a quote or a time.",
    hero: homeLiving, heroAlt: "A bright living room with a cream sofa", side: tomatoes, sideAlt: "Fresh tomatoes being rinsed at a kitchen sink",
    offer: [
      { title: "Repairs", body: "Plumbers, electricians and handymen who turn up when they say." },
      { title: "Moves", body: "Packing, movers and set-up at the other end." },
      { title: "Cleaning", body: "One-off deep cleans or regular help, arranged and checked." },
      { title: "Household staff", body: "Help finding drivers, cooks and housekeepers." },
      { title: "Home checks", body: "Someone to check on a family house while you’re away." },
      { title: "Generators and solar", body: "Servicing, fuel and installers, booked and followed up." },
    ],
    examples: [{ label: "Repairs", text: "A plumber who can come today" }, { label: "House checks", text: "Someone to check on Dad’s house in Abuja" }, { label: "Moves", text: "Movers for a two-bed flat next Saturday" }, { label: "Cleaning", text: "A deep clean before guests arrive" }, { label: "Power", text: "An electrician to fix the inverter" }, { label: "Household help", text: "A reliable cook three days a week" }, { label: "Outdoors", text: "Someone to sort out the overgrown compound" }, { label: "Fittings", text: "Curtains measured and hung in the new flat" }],
    faqs: [
      { q: "Are your contractors vetted?", a: "We use people we’ve worked with before and check every job is finished properly." },
      { q: "Who do I pay?", a: "You pay us. We pay the contractor once the job is done." },
      { q: "What if something goes wrong?", a: "Tell us and we’ll get it put right. That’s the point of having us in the middle." },
    ],
  },
  {
    slug: "events-experiences", title: "Events & Experiences", short: "an event", heroTitle: "From a table for two to the whole event",
    intro: "Reservations, private dinners and celebrations, booked and run on the day so you can enjoy it.",
    hero: eventsTable, heroAlt: "An event table laid for dinner", side: dancingWoman, sideAlt: "An older woman dancing at a street party", sidePos: "center top",
    offer: [
      { title: "Reservations", body: "The table you want, including the last-minute ones." },
      { title: "Private dinners", body: "A chef at home for an evening, menu and all." },
      { title: "Celebrations", body: "Birthdays, anniversaries and engagements, planned around you." },
      { title: "Venues and suppliers", body: "Venues, décor, catering and music, sourced and coordinated." },
      { title: "On the day", body: "Someone on site so it runs on time and you don’t have to." },
      { title: "Tickets and experiences", body: "Concerts, shows and days out, booked for you." },
    ],
    examples: [{ label: "Tables", text: "A table at a rooftop spot tonight" }, { label: "Dinners", text: "A private dinner for 12, next Saturday" }, { label: "Days out", text: "A beach day for the family in Ilashe" }, { label: "Proposals", text: "An engagement surprise with flowers and a photographer" }, { label: "Tickets", text: "Two tickets for the concert on Friday" }, { label: "Parties", text: "A street party for Mum’s 80th" }, { label: "Chefs", text: "A chef for a family lunch on Sunday" }, { label: "Décor", text: "Flowers and lighting for an outdoor dinner" }],
    faqs: [
      { q: "How much notice do you need?", a: "For reservations, a few hours can be enough. Bigger events are best with a few weeks." },
      { q: "Do you plan weddings?", a: "We help with parts of a wedding, like suppliers and logistics, rather than full planning." },
      { q: "Can you stay within a budget?", a: "Yes. Tell us the budget and we’ll plan to it, showing every cost in the quote." },
    ],
  },
];

export const getService = (slug: string) => serviceList.find((s) => s.slug === slug);
