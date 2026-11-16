import type { Metadata, Viewport } from "next";
import Home from "../page";

// v2 header band is navy (--espresso in the v2 palette)
export const viewport: Viewport = {
  themeColor: "#0e1527",
};

export const metadata: Metadata = {
  title: "Sorted by Us — Personal concierge in Nigeria (v2)",
  robots: { index: false },
};

/** Same homepage with the navy palette (see [data-palette="v2"] in globals.css). */
export default function HomeV2() {
  return (
    <div data-palette="v2">
      <Home />
    </div>
  );
}
