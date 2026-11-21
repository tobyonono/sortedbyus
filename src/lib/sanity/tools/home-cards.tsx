// Studio landing layout (cards only, no Studio hooks) so it can also render
// outside the Studio, e.g. the motion harness page. Four cards, each just the
// service name in the brand serif.
import { Card } from "@sanity/ui";
import "./home.css";

export interface HomeSection {
  title: string;
  /** Tool name to open; none means it isn't built yet. */
  tool?: string;
}

export const HOME_SECTIONS: HomeSection[] = [
  { title: "Motion", tool: "motion" },
  { title: "Static" },
  { title: "Web", tool: "structure" },
  { title: "Insights" },
];

export function HomeCards({ onOpen }: { onOpen: (tool: string) => void }) {
  return (
    <Card height="fill" overflow="auto" className="sbu-home">
      <div className="sbu-home-inner">
        <h1 className="sbu-home-title">Sorted by Us</h1>
        <div className="sbu-home-grid">
          {HOME_SECTIONS.map((s) =>
            s.tool ? (
              <button key={s.title} type="button" className="sbu-home-card" onClick={() => onOpen(s.tool!)}>
                <span className="sbu-home-name">{s.title}</span>
              </button>
            ) : (
              <div key={s.title} className="sbu-home-card is-soon" aria-disabled="true">
                <span className="sbu-home-name">{s.title}</span>
                <span className="sbu-home-soon">Coming soon</span>
              </div>
            ),
          )}
        </div>
      </div>
    </Card>
  );
}
