// Pre-converts every photo in src/assets to high-quality WebP at fixed widths, so images are served as
// cached static files instead of being resized per request (Cloudflare does that on every hit, 1–2s each).
// Output: public/img/<name>.<hash>-<width>.webp + src/lib/image-manifest.json (both generated, gitignored).
// The site-wide loader (src/lib/image-loader.ts) maps each next/image request to the nearest file.
// Runs before `next dev` and `next build`; unchanged images are skipped.
import { createHash } from "node:crypto";
import { mkdir, readdir, readFile, writeFile, access, unlink } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

// Phone-sized files (≤ 828px wide) at q80: they're what phones download first, and the difference isn't
// visible at that size. Everything larger (retina phones, tablets, desktop) stays at q90.
const QUALITY = 90;
const SMALL_QUALITY = 80;
const SMALL_MAX = 828;
const qualityFor = (w) => (w <= SMALL_MAX ? SMALL_QUALITY : QUALITY);
const WIDTHS = [640, 828, 1080, 1280, 1920, 2560];
const SRC = "src/assets";
const OUT = "public/img";
const MANIFEST = "src/lib/image-manifest.json";

async function walk(dir) {
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...(await walk(p)));
    else if (/\.(jpe?g|png)$/i.test(e.name)) out.push(p);
  }
  return out;
}
const exists = (p) => access(p).then(() => true, () => false);

await mkdir(OUT, { recursive: true });
const manifest = {};
let made = 0;
for (const file of await walk(SRC)) {
  const name = path.basename(file).replace(/\.[^.]+$/, "");
  if (manifest[name]) throw new Error(`Duplicate image name "${name}" (${file}): names must be unique`);
  const buf = await readFile(file);
  const hash = createHash("sha1").update(buf).update(`q${SMALL_QUALITY}<=${SMALL_MAX}/q${QUALITY}`).digest("hex").slice(0, 8);
  const { width: srcW } = await sharp(buf).metadata();
  // every standard width up to the original, plus the original width itself if it's smaller than the max
  const widths = [...new Set([...WIDTHS.filter((w) => w < srcW), Math.min(srcW, WIDTHS.at(-1))])];
  for (const w of widths) {
    const out = path.join(OUT, `${name}.${hash}-${w}.webp`);
    if (await exists(out)) continue;
    await sharp(buf).resize({ width: w }).webp({ quality: qualityFor(w), effort: 6, smartSubsample: true }).toFile(out);
    made++;
  }
  manifest[name] = { hash, widths };
}
// drop files from earlier settings or removed photos, so they aren't deployed
const keep = new Set(Object.entries(manifest).flatMap(([n, { hash, widths }]) => widths.map((w) => `${n}.${hash}-${w}.webp`)));
let removed = 0;
for (const f of await readdir(OUT)) if (f.endsWith(".webp") && !keep.has(f)) { await unlink(path.join(OUT, f)); removed++; }
await writeFile(MANIFEST, JSON.stringify(manifest, null, 1) + "\n");
console.log(`optimize-images: ${Object.keys(manifest).length} images, ${made} new files, ${removed} stale removed (WebP q${SMALL_QUALITY} up to ${SMALL_MAX}px, q${QUALITY} above)`);
