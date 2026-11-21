import { getCloudflareContext } from "@opennextjs/cloudflare";

const HEADERS = { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-cache" };

/**
 * The Studio is a static single-page app in public/studio (built by `npm run build:studio`). Its real files are
 * served directly; /studio itself and any other /studio/… address (a deep link like /studio/structure/homePage)
 * get its index.html so the Studio can open that screen itself.
 *
 * In `next dev` the ASSETS binding reads .open-next/assets, which only changes on a Cloudflare build, while the
 * Studio's JS comes fresh from public/studio — so dev reads index.html from public/studio to keep them in step.
 */
export async function GET(req: Request) {
  if (process.env.NODE_ENV === "development") {
    const { readFile } = await import("node:fs/promises");
    const { join } = await import("node:path");
    return new Response(await readFile(join(process.cwd(), "public/studio/index.html"), "utf8"), { headers: HEADERS });
  }
  const { env } = await getCloudflareContext({ async: true });
  const res = await env.ASSETS.fetch(new URL("/studio/index.html", req.url));
  return new Response(res.body, { status: 200, headers: HEADERS });
}
