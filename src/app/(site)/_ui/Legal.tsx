import SiteHeader from "@/components/SiteHeader";
import Footer from "./Footer";
import h from "../../home.module.css";
import d from "./pages.module.css";

/** Plain text page for policies: espresso header band, a centred 720px column. */
export default function Legal({ title, updated, sections }: { title: string; updated?: string; sections: { h: string; p: string[] }[] }) {
  return (
    <>
      <div className={h.top}><SiteHeader /></div>
      <main>
        <section className={d.section}>
          <div className={d.legal}>
            <p className={h.label}>Legal</p>
            <h1 className={h.h2} style={{ textAlign: "left", color: "var(--ink)" }}>{title}</h1>
            <p className={d.updated}>Last updated: {updated ? new Date(updated).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) : "[date]"}</p>
            <p className={d.draftNote}>Draft structure. The wording needs review against Nigerian data protection and consumer law before launch.</p>
            {sections.map((s) => (
              <div key={s.h} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <h2>{s.h}</h2>
                {s.p.map((p) => <p key={p}>{p}</p>)}
              </div>
            ))}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
