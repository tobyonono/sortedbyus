import Link from "next/link";
import Wordmark from "@/components/ui/Wordmark";
import { site } from "@/lib/site";
import { getSite } from "@/lib/sanity/site";
import h from "@/styles/home.module.css";

/** Site footer: shared by the homepage and every inner page. */
export default async function Footer() {
  const { services, settings, wa } = await getSite();
  return (
    <footer className={h.footer}>
      <div className={h.footTop}>
        <Link href="/" className={h.footBrand}>
          <Wordmark title={`${site.name} home`} />
        </Link>
        <div className={h.footCol}>
          <h2 className={h.footHead}>Explore</h2>
          <ul>
            <li><Link className="hover-link" href="/how-it-works">How it works</Link></li>
            <li><Link className="hover-link" href="/corporate">Corporate services</Link></li>
            <li><Link className="hover-link" href="/about">About us</Link></li>
            <li><Link className="hover-link" href="/contact">Contact</Link></li>
          </ul>
        </div>
        <div className={h.footCol}>
          <h2 className={h.footHead}>What we do</h2>
          <ul>{services.map((s) => <li key={s.slug}><Link className="hover-link" href={`/services/${s.slug}`}>{s.title}</Link></li>)}</ul>
        </div>
        <div className={h.footCol}>
          <h2 className={h.footHead}>Get in touch</h2>
          <ul>
            <li><a className="hover-link" href={wa()}>WhatsApp</a></li>
            <li><a className="hover-link" href={`mailto:${settings.email}`}>{settings.email}</a></li>
            {settings.instagram && <li><a className="hover-link" href={settings.instagram}>Instagram</a></li>}
            {settings.linkedin && <li><a className="hover-link" href={settings.linkedin}>LinkedIn</a></li>}
          </ul>
        </div>
      </div>
      <div className={h.footBottom}>
        <p>© 2026 Sorted by Us · Lagos, Nigeria</p>
        <ul>
          <li><Link className="hover-link" href="/privacy">Privacy policy</Link></li>
          <li><Link className="hover-link" href="/terms">Terms of service</Link></li>
        </ul>
      </div>
    </footer>
  );
}
