import NetworkMap from "./NetworkMap";
import b from "./MapBanner.module.css";

/** One full-width espresso band: heading on top, the network map across the middle (wide layout;
    the tall one on phones), and the short points in a row underneath. */
export default function MapBanner({ label, title, points }: {
  label: string; title: string; points: { t: string; b: string }[];
}) {
  return (
    <div className={b.band}>
      <div className={b.head}>
        <div>
          <p className={b.label}>{label}</p>
          <h2 id="network-heading" className={b.heading}>{title}</h2>
        </div>
      </div>
      <NetworkMap bare wide className={b.mapWide} />
      <NetworkMap bare className={b.mapTall} />
      <ol className={b.points}>
        {points.map((p) => <li key={p.t}><strong>{p.t}</strong><span>{p.b}</span></li>)}
      </ol>
    </div>
  );
}
