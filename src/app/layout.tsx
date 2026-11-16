import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { site } from "@/lib/site";
import HeroPrefetch from "@/components/HeroPrefetch";
import { getHeroes } from "@/sanity/queries";

const herbik = localFont({
  src: "./fonts/Herbik-Regular.woff2",
  variable: "--font-display",
  display: "swap",
});

const turnery = localFont({
  src: [
    { path: "./fonts/Turnery-Regular.woff2", weight: "400", style: "normal" },
    { path: "./fonts/Turnery-Medium.woff2", weight: "500", style: "normal" },
  ],
  variable: "--font-body",
  display: "swap",
});

// Browser chrome / status bar matches the dark header band (--espresso)
export const viewport: Viewport = {
  themeColor: "#2f2116",
};

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: { default: "Sorted by Us — Personal concierge in Nigeria", template: "%s · Sorted by Us" },
  description: site.description,
  applicationName: site.name,
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const heroes = Object.fromEntries((await getHeroes()).filter((h) => h.url).map((h) => [h.path, h.url]));
  return (
    // suppressHydrationWarning: the inline script adds the `js` class before React hydrates.
    <html lang="en-NG" data-scroll-behavior="smooth" className={`${herbik.variable} ${turnery.variable}`} suppressHydrationWarning>
      <head>
        {/* Enables reveal animations only when JS runs, so content is never hidden without it. */}
        <script dangerouslySetInnerHTML={{ __html: "if('IntersectionObserver' in window)document.documentElement.classList.add('js')" }} />
      </head>
      <body>
        {children}
        <HeroPrefetch map={heroes} />
      </body>
    </html>
  );
}
