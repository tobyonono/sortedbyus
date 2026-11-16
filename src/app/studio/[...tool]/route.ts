import { getCloudflareContext } from "@opennextjs/cloudflare";

/**
 * The Studio is a static single-page app in public/studio (built by `npm run build:studio`). Its real files are
 * served directly; any other /studio/… address (a deep link like /studio/structure/homePage) gets its index.html
 * so the Studio can open that screen itself.
 */
export async function GET(req: Request) {
  const { env } = await getCloudflareContext({ async: true });
  const res = await env.ASSETS.fetch(new URL("/studio/index.html", req.url));
  return new Response(res.body, { status: 200, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-cache" } });
}
