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
    <div className="about-screen">
      <div className="about-bg" aria-hidden="true">
        <video
          className="about-bg__video"
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          poster="/about-bg-poster.jpg"
          src="/about-bg.mp4"
          width={720}
          height={1280}
        />
      </div>
      <div className="page about-page">
        <header className="about-brand">
          <img className="about-logo" src="/logo.svg" width={96} height={96} alt="GoodDayNight" />
          <Link className="badge" href="/">
            GoodDayNight
          </Link>
        </header>

        <main id="main">
          <section className="card card--lavender" aria-label="About the maker">
            <p className="card__body">{LANDING.about.body}</p>
            <p className="about-sign">{LANDING.about.signature}</p>
          </section>
        </main>

        <SiteFooter />
      </div>
    </div>
  );
}
