import Footer from "@/components/layout/Footer";
import SiteHeader from "@/components/layout/SiteHeader";
import { motionGuide } from "@/lib/motion-guide";
import h from "@/styles/home.module.css";
import type { Metadata } from "next";
import g from "./guide.module.css";

export const metadata: Metadata = {
  title: "Motion studio guide",
  description: "How the Sorted by Us team and their AI assistants make short brand videos in the motion studio.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-static";

/** /motion/guide: the motion studio explained for the team and their AI assistants. Generated from the templates. */
export default function Page() {
  const guide = motionGuide();
  const example = `Make a 9:16 Sort flash from our five newest services, with photos from the Sanity media library. Then render it and send me the link.`;

  return (
    <>
      <div className={h.top}>
        <SiteHeader />
      </div>
      <main className={g.page}>
        <header className={g.hero}>
          <p className={g.label}>Motion studio</p>
          <h1 className={g.title}>Sort a video with your AI assistant</h1>
          <p className={g.lead}>
            Ask Claude, ChatGPT or Codex for a short video. It builds the composition in Sanity from the site’s own words and photos, renders it in a
            browser, and someone on the team checks it before it goes out.
          </p>
        </header>

        <ol className={g.steps}>
          <li className={g.step}>
            <span className={g.num}>1</span>
            <h2>Connect Sanity</h2>
            <p>Add Sanity’s MCP server to your assistant and sign in. It can do what your Sanity role allows, and nothing more.</p>
            <code className={g.code}>{guide.mcp}</code>
          </li>
          <li className={g.step}>
            <span className={g.num}>2</span>
            <h2>Ask for a video</h2>
            <p>Say which template, which format, and where the words and photos should come from.</p>
            <blockquote className={g.prompt}>{example}</blockquote>
          </li>
          <li className={g.step}>
            <span className={g.num}>3</span>
            <h2>Render it</h2>
            <p>The assistant opens a studio link in its browser. Each format renders there and is saved to Sanity with the composition.</p>
            <code className={g.code}>/studio/motion?c=…&amp;export=story,portrait</code>
          </li>
          <li className={g.step}>
            <span className={g.num}>4</span>
            <h2>Check and publish</h2>
            <p>Agent work arrives as a draft. Open it in the studio, change anything you like, then publish. The videos sit under Exports.</p>
            {/* The Studio is a separate app (public/studio), so this is a full page load, not a Next route. */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a className={g.link} href="/studio/motion">
              Open the studio
            </a>
          </li>
        </ol>

        <section className={g.section}>
          <h2 className={g.h2}>Templates</h2>
          <div className={g.templates}>
            {guide.templates.map((t) => (
              <article key={t.id} className={g.template}>
                <h3>{t.name}</h3>
                <p className={g.muted}>{t.description}</p>
                <table className={g.table}>
                  <thead>
                    <tr>
                      <th>Setting</th>
                      <th>Accepts</th>
                    </tr>
                  </thead>
                  <tbody>
                    {t.fields.map((f) => (
                      <tr key={f.path}>
                        <td>{f.label}</td>
                        <td>{f.accepts}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </article>
            ))}
          </div>
        </section>

        <section className={g.section}>
          <h2 className={g.h2}>Reels</h2>
          <p className={g.muted}>
            A reel puts compositions in order for a longer video. Each screen points at a composition, so a fix to the composition shows up in
            every reel that uses it. Between screens you choose a cut, crossfade, push, slide or smart animate, each on a brand spring, and you can
            trim any screen. Smart animate glides the same photo, or a line with the same words, from one screen to the next.
          </p>
        </section>

        <section className={g.section}>
          <h2 className={g.h2}>Brand rules</h2>
          <p className={g.muted}>Assistants can only use these. Anything else is swapped for the template’s default when the studio opens it.</p>
          <h3 className={g.h3}>Colours</h3>
          <ul className={g.swatches}>
            {guide.palette.map((p) => (
              <li key={p.name}>
                <span className={g.swatch} style={{ background: p.hex }} />
                <strong>{p.name}</strong>
                <code>{p.hex}</code>
              </li>
            ))}
          </ul>
          <h3 className={g.h3}>Springs</h3>
          <ul className={g.springs}>
            {guide.springs.map((s) => (
              <li key={s.key}>
                <strong>{s.label}</strong>
                <span className={g.muted}>settles in {s.settle.toFixed(2)} s</span>
              </li>
            ))}
          </ul>
          <h3 className={g.h3}>Formats</h3>
          <ul className={g.springs}>
            {guide.formats.map((f) => (
              <li key={f.key}>
                <strong>{f.label}</strong>
                <span className={g.muted}>{f.size}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className={g.section}>
          <h2 className={g.h2}>For assistants</h2>
          <p className={g.muted}>
            The same guide as plain text, with every field path and an example render link:{" "}
            <a className={g.inline} href="/motion/guide.md">
              /motion/guide.md
            </a>
            . Point your assistant at it before the first request.
          </p>
        </section>
      </main>
      <Footer />
    </>
  );
}
