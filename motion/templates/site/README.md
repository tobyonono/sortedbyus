# Site blocks

Templates made from the website's own React components, so videos match the site exactly.
First one: `../site-request-card` (the request form filling itself in).

## How it works

1. The site component is split so its look takes props only (`RequestCardView`); the site wrapper
   keeps state. The site's markup is unchanged.
2. The template's `Frame` renders that view with props scripted against the frame number.
   CSS animations and transitions are switched off, so every frame is a function of its number.
3. `domFrames.tsx` captures a frame: render in a hidden box at video size, serialise the markup,
   add only the CSS rules that mention its classes (the Studio has thousands of its own) and the
   brand fonts as data URLs, wrap it in an SVG `<foreignObject>`, decode it as an image.
4. The template's `prepare(frame)` captures; `draw(frame)` paints the captured image. Exports await
   `prepare` for every frame. The stage and thumbnails ask for frames as they play and show the
   nearest ready one meanwhile (`motion/studio/src/framePrep.ts`).

Imports: site components use `@/` and `next/link`. Both are aliased in `sanity.cli.ts` (Studio)
and `motion/studio/vite.config.ts` (harness); `nextLink.tsx` is a plain `<a>` stand-in. The site's
design tokens come from `globals.css` and `motion-tokens.css` (`?raw`), scoped to the block, so
nothing leaks into the Studio.

## Gotchas

- The SVG must be a `data:` URL, and frames are kept as decoded `<img>`s. A `blob:` URL or an
  `ImageBitmap` of an SVG with a `foreignObject` is tainted, and the encoder can't read it.
- Fonts and photos must be inlined: an SVG drawn as an image can't fetch anything.
- `flushSync` can't run during a React render, so captures start in a microtask.
- `foreignObject` can't draw `<video>`, `<canvas>` or iframes. A block that needs those would use
  headless Chrome screenshots instead (tested in the spike: same speed, needs a paid service).
- Site blocks don't describe scenes yet, so smart animate into or out of them falls back to a crossfade.

## Spike numbers (150 frames, 1080×1350, Chrome)

| | In the browser (used) | Headless Chrome |
|---|---|---|
| Time | 9.0 s | 8.6 s |
| Match | 0.8–1.1 % of pixels differ (anti-aliasing) | is the real DOM |
| Runs | in the editor's tab, free | needs Cloudflare Browser Rendering |

## Adding another block

Split the component into a view, write a `Frame` that scripts its props over time, and copy
`site-request-card/index.tsx` for prepare/draw. Register it in `../specs.ts` and
`motion/studio/src/templates.ts`.
