/**
 * Reduced-motion policy, in one place:
 * - CSS: globals.css drops every movement transition under `prefers-reduced-motion: reduce` (fades and colour
 *   changes stay) and skips keyframe entrances; smooth scrolling only runs when motion is allowed.
 * - JS: anything that moves things itself (carousel, map, timeline, scroll grow, tab auto-advance, calendar
 *   scroll) checks this first.
 */
export const prefersReducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
