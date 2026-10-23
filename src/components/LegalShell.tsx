import Link from "next/link";
import type { ReactNode } from "react";
import SiteFooter from "@/components/SiteFooter";

/** Plain page for Privacy and Terms. */
export default function LegalShell({ id, title, updated, children }: { id: string; title: string; updated: string; children: ReactNode }) {
  return (
    <div className="page legal-page">
      <header className="site-header">
        <Link className="badge" href="/">
          GoodDayNight
        </Link>
      </header>
      <main id="main">
        <section className="card card--lavender legal-card" aria-labelledby={id}>
          <h1 id={id}>{title}</h1>
          <p className="card__body">Last updated {updated}.</p>
          {children}
        </section>
      </main>
      <SiteFooter site />
    </div>
  );
}
