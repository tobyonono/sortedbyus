import s from "./Principles.module.css";

/* Brand colours, light to dark; the last tile takes apricot type. */
const TONES = ["#b89562", "var(--olive)", "#a5745b", "var(--espresso)"];

/**
 * Values as tall colour tiles (Human After All "creative principles" pattern): each shows its name;
 * on hover or keyboard focus the name rises and the description fades in beneath it. Touch screens,
 * which have no hover, show both.
 */
export default function Principles({ items }: { items: { title: string; body: string }[] }) {
  return (
    <ul className={s.grid}>
      {items.map((it, i) => (
        <li key={it.title} className={s.tile} tabIndex={0} style={{ "--tone": TONES[i % TONES.length] } as React.CSSProperties} data-dark={i % TONES.length === TONES.length - 1 || undefined}>
          <h3 className={s.title}>{it.title}</h3>
          <p className={s.body}>{it.body}</p>
        </li>
      ))}
    </ul>
  );
}
