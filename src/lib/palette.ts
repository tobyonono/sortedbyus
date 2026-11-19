/**
 * Palette hierarchy (tokens in globals.css):
 * - Primary, the brand itself: espresso and apricot (plus the cream page). Header, footer, hero bands, text.
 * - Secondary, the earth family: caramel, olive, terracotta, taupe. Section bands, tiles and card cuts.
 * - Tertiary, actions only: butter (butter-hover is its hover state). Buttons, focus, the request card.
 *   Butter never colours a cut, so a yellow thing on the page always means "you can press this".
 *
 * Card sets take their cut colours from EARTH in this one order, so every set looks varied but the rhythm is
 * the same on every page. The About value tiles are the one tuned exception (Principles.tsx).
 */
export const EARTH = ["var(--caramel)", "var(--olive)", "var(--terracotta)", "var(--taupe)"] as const;

/** The cut colour for the card at position i in a set. */
export const earth = (i: number) => EARTH[i % EARTH.length];
