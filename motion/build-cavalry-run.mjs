// Bundles brand tokens + a template document + the template's Cavalry script
// into one file that Cavalry can run with api.load(path).
// Usage: node motion/build-cavalry-run.mjs <template-id> <data.json|-> <out.js> [renderDir renderName]
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
const [id, dataPath, out, renderDir, renderName] = process.argv.slice(2);
if (!id || !out) {
  console.error("usage: build-cavalry-run.mjs <template-id> <data.json|-> <out.js> [renderDir renderName]");
  process.exit(1);
}

const brand = JSON.parse(readFileSync(join(root, "brand.json"), "utf8"));
const tdir = join(root, "templates", id);
const template = JSON.parse(readFileSync(join(tdir, "template.json"), "utf8"));
const data =
  !dataPath || dataPath === "-"
    ? template.defaults
    : { ...template.defaults, ...JSON.parse(readFileSync(resolve(dataPath), "utf8")) };
const source = readFileSync(join(tdir, "apply.cavalry.js"), "utf8");
const fn = "apply" + id.replace(/(^|-)(\w)/g, (_, __, c) => c.toUpperCase());
const opts = {
  assetDir: process.env.MOTION_ASSET_DIR || null,
  render: renderDir ? { dir: resolve(renderDir), name: renderName || id } : null,
};

writeFileSync(
  out,
  `var BRAND = ${JSON.stringify(brand)};
var DATA = ${JSON.stringify(data)};
var OPTS = ${JSON.stringify(opts)};
${source}
console.log(JSON.stringify(${fn}(DATA, BRAND, OPTS)));
`,
);
console.log(out);
