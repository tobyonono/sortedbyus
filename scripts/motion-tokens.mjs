// Writes src/styles/motion-tokens.css from motion/brand.json, so the website and
// the motion studio share one set of easings, durations and springs.
// Springs become CSS linear() curves: `transition: transform var(--spring-card-duration) var(--spring-card)`.
// Runs before dev and build; edit motion/brand.json, not the generated file.
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { springToCss } from "../motion/engine/spring.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const brand = JSON.parse(readFileSync(join(root, "motion/brand.json"), "utf8"));

const EASE_VARS = { out: "--ease-out", reveal: "--ease-reveal", standard: "--ease", drawer: "--ease-drawer" };
const DUR_VARS = { press: "--dur-press", fast: "--dur-fast", ui: "--dur-ui", base: "--dur", enter: "--dur-enter" };

const lines = [];
for (const [k, v] of Object.entries(brand.ease)) lines.push(`  ${EASE_VARS[k] ?? `--ease-${k}`}: cubic-bezier(${v.join(", ")});`);
for (const [k, v] of Object.entries(brand.durations)) lines.push(`  ${DUR_VARS[k] ?? `--dur-${k}`}: ${v}ms;`);
lines.push(`  --rise: ${brand.rise}px;`);
for (const [k, s] of Object.entries(brand.springs)) {
  const { easing, durationMs } = springToCss(s);
  lines.push(`  --spring-${k}: ${easing};`, `  --spring-${k}-duration: ${durationMs}ms;`);
}

const css = `/* Generated from motion/brand.json by scripts/motion-tokens.mjs. Edit brand.json, not this file.
   Shared by the website and the motion studio (/studio/motion).
     --ease-out     anything entering, leaving or being pressed (strong ease-out)
     --ease-reveal  big on-screen movement: process carousel, hero block
     --ease         hover and colour changes
     --ease-drawer  the slide-over panel
     --dur-*        press feedback, UI, hover, marketing entrances
     --rise         how far marketing content rises as it enters
     --spring-*     springs as CSS curves; pair each with its --spring-*-duration */
:root {
${lines.join("\n")}
}
`;

const out = join(root, "src/styles/motion-tokens.css");
let prev = "";
try {
  prev = readFileSync(out, "utf8");
} catch {}
if (prev !== css) writeFileSync(out, css);
console.log(`motion tokens: ${Object.keys(brand.springs).length} springs → src/styles/motion-tokens.css${prev === css ? " (unchanged)" : ""}`);
