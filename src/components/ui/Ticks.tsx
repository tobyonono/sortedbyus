import d from "@/styles/pages.module.css";

/** Plain list between hairlines (no tick icons). */
export default function Ticks({ items }: { items: string[] }) {
  return (
    <ul className={d.ticks}>
      {items.map((i) => (
        <li key={i}>
          <span>{i}</span>
        </li>
      ))}
    </ul>
  );
}
