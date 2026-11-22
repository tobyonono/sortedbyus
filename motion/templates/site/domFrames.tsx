// Site blocks: video frames made from the website's own React components.
// Each frame renders the component in a hidden box at video size, wraps its markup and the CSS it
// uses in an SVG <foreignObject>, and decodes that as an image (all in the browser, no server).
// Findings from the spike that chose this route are in ./README.md.
import type { ReactNode } from "react";
import { flushSync } from "react-dom";
import { createRoot, type Root } from "react-dom/client";
import type { Ctx2D } from "../../engine";
import herbikUrl from "../../studio/src/fonts/Herbik-Regular.woff2?url";
import turneryUrl from "../../studio/src/fonts/Turnery-Regular.woff2?url";
import turneryMediumUrl from "../../studio/src/fonts/Turnery-Medium.woff2?url";

const FONTS = [
  { family: "Herbik", weight: 400, url: herbikUrl },
  { family: "Turnery", weight: 400, url: turneryUrl },
  { family: "Turnery", weight: 500, url: turneryMediumUrl },
];

async function dataUrl(url: string) {
  const blob = await (await fetch(url)).blob();
  return new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });
}

let fontCss: Promise<string> | null = null;
/** @font-face rules with the fonts inlined: an SVG drawn as an image can't fetch anything. */
const inlineFonts = () =>
  (fontCss ??= Promise.all(
    FONTS.map(async (f) => `@font-face{font-family:"${f.family}";font-weight:${f.weight};src:url(${await dataUrl(f.url)}) format("woff2");}`),
  ).then((r) => r.join("\n")));

const escapeXml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/**
 * The page's CSS rules that mention a class used in the block. The Studio has thousands of rules of
 * its own; only the block's (its CSS modules and helpers) go into each frame.
 */
const cssCache = new Map<string, string>();
function cssFor(node: Element) {
  const classes = new Set<string>();
  for (const el of [node, ...node.querySelectorAll("*")]) for (const c of el.classList) classes.add(c);
  const key = [...classes].sort().join(" ");
  const hit = cssCache.get(key);
  if (hit !== undefined) return hit;
  const uses = (selector: string) => [...selector.matchAll(/\.([\w-]+)/g)].some((m) => classes.has(m[1]));
  const pick = (rules: CSSRuleList): string[] =>
    [...rules].flatMap((r) => {
      if (r instanceof CSSStyleRule) return uses(r.selectorText) ? [r.cssText] : [];
      if (r instanceof CSSMediaRule) {
        const inner = pick(r.cssRules);
        return inner.length ? [`@media ${r.conditionText}{${inner.join("\n")}}`] : [];
      }
      return [];
    });
  const css = [...document.styleSheets]
    .flatMap((sheet) => {
      try {
        return pick(sheet.cssRules);
      } catch {
        return []; // cross-origin sheets can't be read
      }
    })
    .join("\n");
  cssCache.set(key, css);
  return css;
}

/** Captures frames of one block and keeps the recent ones as decoded images. */
export class DomFrames {
  private host: HTMLDivElement | null = null;
  private root: Root | null = null;
  // Decoded <img>s, not ImageBitmaps: Chrome marks a bitmap made from an SVG with a foreignObject
  // as tainted, which stops the encoder reading it. Drawing the decoded image directly is allowed.
  private frames = new Map<string, HTMLImageElement>();

  constructor(private keep = 24) {}

  private mount(width: number, height: number) {
    if (!this.host) {
      this.host = document.createElement("div");
      // Laid out (so styles apply) but invisible and out of the way.
      this.host.style.cssText = "position:fixed;left:0;top:0;opacity:0;pointer-events:none;z-index:-1;contain:strict;overflow:hidden";
      this.host.setAttribute("aria-hidden", "true");
      document.body.appendChild(this.host);
      this.root = createRoot(this.host);
    }
    this.host.style.width = `${width}px`;
    this.host.style.height = `${height}px`;
  }

  has(key: string) {
    return this.frames.has(key);
  }

  /** Render `node` at width × height and store the frame under `key`. */
  async capture(key: string, node: ReactNode, width: number, height: number) {
    if (this.frames.has(key)) return;
    this.mount(width, height);
    // Render and serialise synchronously, so captures running side by side never mix frames.
    flushSync(() => this.root!.render(node));
    const el = this.host!.firstElementChild;
    if (!el) return;
    const markup = new XMLSerializer().serializeToString(el);
    const css = cssFor(el);
    const fonts = await inlineFonts();
    const svg =
      `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">` +
      `<foreignObject x="0" y="0" width="${width}" height="${height}">` +
      `<div xmlns="http://www.w3.org/1999/xhtml"><style>${escapeXml(fonts + "\n" + css)}</style>${markup}</div>` +
      `</foreignObject></svg>`;
    // A data: URL, not a blob: URL. Chrome taints the canvas for a blob-URL SVG with a
    // foreignObject, and a tainted canvas can't be read back to encode.
    const img = new Image();
    img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
    await img.decode();
    this.frames.set(key, img);
    while (this.frames.size > this.keep) this.frames.delete(this.frames.keys().next().value!);
  }

  /** Draw the frame stored under `key`, or the nearest stored frame with the same prefix. */
  draw(ctx: Ctx2D, key: string, prefix: string, frame: number, width: number, height: number) {
    let bmp = this.frames.get(key);
    if (!bmp) {
      let best = Infinity;
      for (const [k, b] of this.frames) {
        if (!k.startsWith(prefix)) continue;
        const d = Math.abs(Number(k.slice(prefix.length)) - frame);
        if (d < best) {
          best = d;
          bmp = b;
        }
      }
    }
    if (!bmp) return false;
    ctx.drawImage(bmp, 0, 0, width, height);
    return true;
  }
}
