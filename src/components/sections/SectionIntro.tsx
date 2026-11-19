import Reveal from "@/components/ui/Reveal";
import h from "@/styles/home.module.css";
import d from "@/styles/pages.module.css";

/** Centred label → heading → intro, as on the homepage sections. */
export default function SectionIntro({ label, title, intro, id, sub }: { label?: string; title: string; intro?: string; id?: string; sub?: boolean }) {
  return (
    <Reveal className={`${h.introGroup} ${d.sectionIntro}`} variant="cut" threshold={0.3}>
      {label && <p className={h.labelCenter}>{label}</p>}
      <h2 id={id} className={`${h.h2} ${sub ? h.subHeading : ""}`}>{title}</h2>
      {intro && <p className={h.intro}>{intro}</p>}
    </Reveal>
  );
}
