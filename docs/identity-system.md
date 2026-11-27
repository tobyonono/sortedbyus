# Identity system: the kit and its rules

What the Sorted by Us look is made of, and the rules that keep it ours when we use it somewhere new. Read
this before you design a new section, add a photo or pick a colour.

## The kit

The system gets a wide range of looks from very few parts:

| Part | What it is | Where it lives |
|---|---|---|
| The cut | An angled colour block that cuts into a photo or a card corner. The double cut (two teeth, 7px soft corners, tone on tone) is on the colour tiles; turned on its side, as the stepped banner edge (`CutBanner` `step`), it's on the homepage banners | `CutBanner`, the hero block (`home.module.css` `.heroBlock`), `.cut` on cards (`pages.module.css`), the network map corner |
| Earth colours | caramel, olive, terracotta, taupe, used in that order (`src/lib/palette.ts`) | section bands, tiles, card cuts, banner blocks |
| Butter | `--butter` #FEE197 | only on things you can press: buttons, links, the lit route on the map |
| Espresso and cream | `--espresso` #2F2116, `--cream` #FCFAF6 | page grounds and text |
| Type | Display serif for headings, sans for everything else | `--display`, `--body` |

## Rule 1: the cut is our frame for content we don't make

Most of our photos aren't ours. Today they're stock; later they'll be client and partner photos. The cut
is what makes any of them read as Sorted by Us. Every photo of a person or place sits inside a cut frame.
None goes on the page bare.

**How to frame a photo**
1. **Pick the frame by place.**
   - Page top: the hero (pointed umber block).
   - End of a page: a closing banner (`CutBanner`, diagonal block in an earth colour).
   - Inside a section: a cut card or a photo tile.
   - One cut per surface. Never stack two blocks on one photo.
2. **Keep the subject clear of the block.**
   - Set the hotspot in Sanity, so the subject lands on the side the block leaves open.
   - If that isn't enough, use `--base-inset-l/-r` on a banner, or `flip` on `PageHero`.
   - A face or a product should never sit under the block or under the type.
3. **Tint the photo, not the type.**
   - The photo gets an espresso tint (`--shade`) so cream or apricot type reads on it.
   - The default tint is 0.36. Closing banners use 0.52.
   - Bright, sunlit photos can take more tint. Dark, moody photos need less.
   - Never add a drop shadow or a box behind the type instead.
4. **The block colour comes from the system, never from the photo.**
   - The hero block is umber.
   - Banner blocks and card cuts are earth colours, in palette order.
   - Butter never fills a block.
5. **Crop out other people's framing first.** Remove borders, letterboxing, watermarks and baked-in text
   before uploading. The cut is the only frame.

**Photo check before uploading**
- Warm light. Real moments rather than posed.
- Room for the block on one side.
- No other brand's logo in shot.
- Never delete a replaced photo from Sanity. Keep it in the library.

## Rule 2: one point of tension per page (on hold)

**Status, Nov 2026:** we tried amber (#F59A45) type on a richer umber hero block (#5A321A), then reverted
both. The hero is back to apricot on `--muted`, and neither colour is in the code. The rule below is how to
use them if they come back.

Everything else on the site is calm and harmonious: cream on brown, butter for actions. That's right for a
concierge. One place per page is allowed a jolt: amber type on the umber hero cut. They're the same warm
hue at very different strengths, a tone-on-tone glow, at 5.0:1 contrast.

**Where amber goes**
- The hero heading and the hero's outline button. That's all.
- The label above the heading stays butter. The intro under it stays apricot, so the heading is the thing
  that glows.

**Where it doesn't**
- Body text and section headings.
- Banners, cards and the map.
- Any other dark surface.

If amber shows up a second time on a page, it stops being the thing you notice. Main calls to action
further down the page stay butter.

**Contrast**
- Amber on umber: 5.0:1.
- Amber on espresso: 7.1:1.
- Both pass for text of any size. Don't use amber on cream or any light ground, because it fails there.
