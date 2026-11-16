"use client";

import dynamic from "next/dynamic";

// Loaded in the browser only, so the Studio's code stays out of the website's server bundle.
const NextStudio = dynamic(
  async () => {
    const [{ NextStudio }, { default: config }] = await Promise.all([import("next-sanity/studio"), import("../../../../sanity.config")]);
    return function S() {
      return <NextStudio config={config} />;
    };
  },
  { ssr: false },
);

export default function Studio() {
  return <NextStudio />;
}
