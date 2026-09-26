import type { Metadata } from "next";
import Link from "next/link";
import SiteFooter from "@/components/SiteFooter";
import { LANDING } from "@/lib/landing";

export const metadata: Metadata = {
  title: LANDING.about.title,
  description: LANDING.about.signature,
};

export default function AboutPage() {
  return (
    <div className="page">
      <header className="site-header">
        <Link className="badge" href="/">
          GoodDayNight
        </Link>
      </header>

      <main id="main">
        <section className="card card--lavender" aria-label="About the maker">
          <p className="card__body">{LANDING.about.body}</p>
          <p className="about-sign">{LANDING.about.signature}</p>
          <span className="card__wash card__wash--ten" aria-hidden="true"></span>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
