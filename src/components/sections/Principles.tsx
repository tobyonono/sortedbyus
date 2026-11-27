import s from "./Principles.module.css";

/* Brand colours, light to dark; the last tile takes apricot type. CUTS: the hover cut on each tile, tone on
   tone: the tile's own colour a step darker (a quarter espresso mixed in), and muted brown on the espresso tile. */
const TONES = ["var(--taupe)", "var(--olive)", "var(--terracotta)", "var(--espresso)"];
const deeper = (c: string) => `color-mix(in srgb, ${c}, var(--espresso) 25%)`;
const CUTS = [deeper("var(--taupe)"), deeper("var(--olive)"), deeper("var(--terracotta)"), "var(--muted)"];

/**
 * Values as tall colour tiles (Human After All "creative principles" pattern): each shows its name;
 * on hover or keyboard focus the name rises and the description fades in beneath it. Touch screens,
 * which have no hover, show both. The brand's diagonal cut rises in along the foot on hover.
 */
export default function Principles({ items }: { items: { title: string; body: string }[] }) {
  return (
    <ul className={s.grid}>
      {items.map((it, i) => (
        <li key={it.title} className={s.tile} tabIndex={0} style={{ "--tone": TONES[i % TONES.length], "--cut": CUTS[i % CUTS.length] } as React.CSSProperties} data-dark={i % TONES.length === TONES.length - 1 || undefined}>
          <span className={s.cut} aria-hidden="true" />
          <h3 className={s.title}>{it.title}</h3>
          <p className={s.body}>{it.body}</p>
        </li>
      ))}
    </ul>
  );
}
