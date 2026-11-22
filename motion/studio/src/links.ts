// What a composition points at, kept as Sanity references so tools and agents can follow them:
// the photos it uses (strong references, so Sanity shows those images as in use and won't let
// them be deleted) and the site services it's about (weak, so a service can still be removed).
// The studio recomputes both on every save; the data itself keeps plain values for drawing.
import { get, type BaseData } from "../../engine";
import { templateById } from "./templates";

/** A Sanity CDN image URL → its asset document id (image-<hash>-<w>x<h>-<ext>), or null. */
export function assetIdFromUrl(url: string): string | null {
  const m = /cdn\.sanity\.io\/images\/[^/]+\/[^/]+\/([a-f0-9]+-\d+x\d+)\.([a-z0-9]+)/i.exec(url);
  return m ? `image-${m[1]}-${m[2].toLowerCase()}` : null;
}

/** Service title → service document id, filled when the studio loads the site's services. */
export const serviceIds = new Map<string, string>();

type Ref = { _key: string; _type: string; _ref: string; _weak?: boolean };
type ImageRef = { _key: string; _type: "image"; asset: { _type: "reference"; _ref: string } };

/** A stable array key from the whole id (the same photo keeps the same key across saves). */
function keyOf(id: string) {
  let h = 5381;
  for (let i = 0; i < id.length; i++) h = ((h * 33) ^ id.charCodeAt(i)) >>> 0;
  return `k${h.toString(36)}${id.length.toString(36)}`;
}
const ref = (id: string, weak = false): Ref => ({ _key: keyOf(id), _type: "reference", _ref: id, ...(weak ? { _weak: true } : {}) });

export function compositionLinks(template: string, data: BaseData): { photoAssets?: ImageRef[]; services?: Ref[] } {
  const t = templateById(template);
  if (!t) return {};
  const photos = [...new Set(t.images(data).map(assetIdFromUrl).filter((x): x is string => !!x))];
  const services = [
    ...new Set(
      t.controls
        .filter((c) => c.type === "service")
        .map((c) => serviceIds.get(get(data, c.key) as string))
        .filter((x): x is string => !!x),
    ),
  ];
  return {
    // image values (each references its asset), the schema's way of pointing at an image document
    photoAssets: photos.map((id) => ({ _key: keyOf(id), _type: "image", asset: { _type: "reference", _ref: id } })),
    services: services.map((id) => ref(id, true)),
  };
}
