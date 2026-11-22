// Spike route (a): snapshot a DOM node into a canvas in the browser, by wrapping its markup and
// the page's CSS in an SVG <foreignObject> and drawing that as an image. Fonts have to be inlined
// as data URLs: an SVG drawn as an image can't fetch anything.
import herbikUrl from "../fonts/Herbik-Regular.woff2?url";
import turneryUrl from "../fonts/Turnery-Regular.woff2?url";
import turneryMediumUrl from "../fonts/Turnery-Medium.woff2?url";

const FONTS = [
  { family: "Herbik", weight: 400, url: herbikUrl },
  { family: "Turnery", weight: 400, url: turneryUrl },
  { family: "Turnery", weight: 500, url: turneryMediumUrl },
];

async function dataUrl(url: string) {
  const blob = await (await fetch(url)).blob();
  return new Promise<string>((resolve) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.readAsDataURL(blob);
  });
}

const escapeXml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Returns a function that draws `node` (at its own size) into `ctx`. CSS is read once. */
export async function domRasterizer(width: number, height: number) {
  const fontCss = (
    await Promise.all(FONTS.map(async (f) => `@font-face{font-family:"${f.family}";font-weight:${f.weight};src:url(${await dataUrl(f.url)}) format("woff2");}`))
  ).join("\n");
  const pageCss = [...document.styleSheets]
    .map((sheet) => {
      try {
        return [...sheet.cssRules].map((r) => r.cssText).join("\n");
      } catch {
        return "";
      }
    })
    .join("\n");
  const head = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><foreignObject x="0" y="0" width="${width}" height="${height}"><div xmlns="http://www.w3.org/1999/xhtml"><style>${escapeXml(fontCss + "\n" + pageCss)}</style>`;
  const tail = `</div></foreignObject></svg>`;

  return async (node: HTMLElement, ctx: CanvasRenderingContext2D) => {
    const markup = new XMLSerializer().serializeToString(node);
    // A data: URL, not a blob: URL. Chrome taints the canvas for a blob-URL SVG with a foreignObject,
    // and a tainted canvas can't be read back to encode.
    const img = new Image();
    img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(head + markup + tail);
    await img.decode();
    ctx.drawImage(img, 0, 0, width, height);
  };
}
