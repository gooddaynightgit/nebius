import type { Metadata } from "next";
import Link from "next/link";
import SiteFooter from "@/components/SiteFooter";
import { LANDING } from "@/lib/landing";
import { pageMetadata } from "@/lib/site-title";

export const metadata: Metadata = pageMetadata({
  name: "About",
  description:
    "GoodDayNight is made by Jasmine Hassam, a software engineer who built an app for adults to find the joy in their day, or turn the day around.",
  path: "/about",
});

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
          <section className="card card--lavender" aria-labelledby="about-heading">
            <h1 id="about-heading">About GoodDayNight’s maker, Jasmine Hassam</h1>
            <p className="card__body">{LANDING.about.body}</p>
            <p className="about-sign">{LANDING.about.signature}</p>
          </section>
        </main>

        <SiteFooter />
      </div>
    </div>
  );
}
