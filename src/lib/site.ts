// Contact details are placeholders until the real WhatsApp Business number and inbox are set up.
export const site = {
  name: "Sorted by Us",
  /** Canonical address: sitemap, canonical links, social previews, llms.txt. Other hosts (workers.dev) aren't indexed. */
  url: "https://sortedbyus.com",
  description:
    "Personal concierge and lifestyle solutions for individuals, families and businesses in Nigeria. Tell us what you need and we’ll get it sorted.",
  tagline: "Your need. Our solution.",
  whatsappNumber: "2348000000000",
  whatsappDisplay: "+234 800 000 0000",
  email: "hello@sortedbyus.com",
  instagram: "https://instagram.com/",
  linkedin: "https://linkedin.com/",
};

export const whatsappHref = (text?: string) =>
  `https://wa.me/${site.whatsappNumber}${text ? `?text=${encodeURIComponent(text)}` : ""}`;

/** The six service pages, grouped under "What we do" in the menu and footer. */
export const serviceNav = [
  { label: "Shopping & Sourcing", href: "/services/shopping-sourcing" },
  { label: "Gifts & Celebrations", href: "/services/gifts-celebrations" },
  { label: "Travel & Holidays", href: "/services/travel-holidays" },
  { label: "Errands & Admin", href: "/services/errands-admin" },
  { label: "Home & Lifestyle", href: "/services/home-lifestyle" },
  { label: "Events & Experiences", href: "/services/events-experiences" },
];

export const nav = [
  { label: "How it works", href: "/how-it-works" },
  { label: "Corporate", href: "/corporate" },
  { label: "About", href: "/about" },
  { label: "Contact", href: "/contact" },
];
