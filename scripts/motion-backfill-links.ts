// One-off: give existing motion compositions their links (photoAssets, services), which the
// studio now keeps on every save. Photos become image fields pointing at their Sanity assets, so
// Sanity shows them as in use and won't delete them.
//   npx sanity exec scripts/motion-backfill-links.ts --with-user-token            (dry run)
//   npx sanity exec scripts/motion-backfill-links.ts --with-user-token -- --write  (apply)
import { getCliClient } from "sanity/cli";

const client = getCliClient({ apiVersion: "2025-01-01" });
const write = process.argv.includes("--write");

const assetIdFromUrl = (url: string) => {
  const m = /cdn\.sanity\.io\/images\/[^/]+\/[^/]+\/([a-f0-9]+-\d+x\d+)\.([a-z0-9]+)/i.exec(url);
  return m ? `image-${m[1]}-${m[2].toLowerCase()}` : null;
};
const keyOf = (id: string) => {
  let h = 5381;
  for (let i = 0; i < id.length; i++) h = ((h * 33) ^ id.charCodeAt(i)) >>> 0;
  return `k${h.toString(36)}${id.length.toString(36)}`;
};
const templateField = (id: string) => id.replace(/-(\w)/g, (_, c: string) => c.toUpperCase());

const services = await client.fetch<{ _id: string; title: string }[]>(`*[_type == "service" && defined(slug.current)]{_id, title}`);
const serviceByTitle = new Map(services.map((s) => [s.title, s._id.replace(/^drafts\./, "")]));
const docs = await client.fetch<Record<string, unknown>[]>(`*[_type == "motionComposition"]`);

for (const doc of docs) {
  const data = doc[templateField(String(doc.template))] ?? doc.data ?? {};
  const json = JSON.stringify(data);
  const photos = [...new Set([...json.matchAll(/https:\/\/cdn\.sanity\.io\/images\/[^"]+/g)].map((m) => assetIdFromUrl(m[0])).filter(Boolean))] as string[];
  const service = (data as { service?: string }).service;
  const serviceId = service ? serviceByTitle.get(service) : undefined;
  const photoAssets = photos.map((id) => ({ _key: keyOf(id), _type: "image", asset: { _type: "reference", _ref: id } }));
  const svc = serviceId ? [{ _key: keyOf(serviceId), _type: "reference", _ref: serviceId, _weak: true }] : [];
  console.log(`${doc._id}  ${doc.title}: ${photoAssets.length} photo(s)${serviceId ? `, service ${serviceId}` : ""}`);
  if (write) await client.patch(String(doc._id)).set({ photoAssets, services: svc }).commit();
}
console.log(write ? "Written." : "Dry run. Add -- --write to apply.");
