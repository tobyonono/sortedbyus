# Site-block spike: Request card

Can the studio make videos from the website's own components? Tried with the request card.
Page: `npm run motion:harness`, then `localhost:3333/siteblock.html`.

- `src/components/sections/RequestCardView.tsx`: the card's markup from props alone. The site's
  `RequestCard` keeps the state and renders it; the homepage markup is unchanged (checked against live).
- `RequestCardClip.tsx`: 5 s, 1080×1350, 30 fps. The card rises in on the Card spring, then fills in
  step 1, presses Continue, moves to step 2 and types a name. CSS animations and transitions are off;
  every frame is a function of the frame number.

## Two export routes (150 frames, M-series Mac, Chrome)

| | (a) In the browser | (b) Headless Chrome |
|---|---|---|
| How | DOM → SVG `foreignObject` → canvas → WebCodecs | step frame, screenshot, encode |
| Time | 9.0 s (60 ms/frame) | 8.6 s (57 ms/frame, 45 of it the screenshot) |
| Matches the real DOM | 0.8–1.1 % of pixels differ, invisible (anti-aliasing) | is the real DOM |
| Runs where | in the editor's tab, like every other export | needs a browser service (Cloudflare Browser Rendering) |
| Cost | free | Browser Rendering time per export |

Gotchas found:
- The SVG must be a `data:` URL. A `blob:` URL taints the canvas and it can't be encoded.
- Fonts must be inlined as data URLs in the SVG (done). Photos will need the same (fetch → data URL, cache).
- globals.css builds `--display`/`--body` from next/font variables at `:root`; outside Next, set them on the clip.
- Things `foreignObject` can't draw: `<video>`, `<canvas>`, iframes, cross-origin images not inlined.

## Go / no-go

**Go, with route (a).** Same output as the browser, same speed as (b), no server, no cost, and it fits
the existing export and agent links unchanged. Keep (b) in reserve for a block that needs something
`foreignObject` can't draw.

To make it a real template:
1. `Playable` gets an optional async `prepare(frame)` (the DOM snapshot), awaited by the exporter and stage.
2. The Studio build needs the same `@/` alias and `next/link` stub as `vite.config.ts` (in `sanity.cli.ts`).
3. Content from Sanity: the request card's services come from the homepage's service list.
4. Inline photos as data URLs before snapshotting blocks that have them.
