import type { Metadata } from "next";
import Link from "next/link";
import SiteFooter from "@/components/SiteFooter";
import { WEAVE_HREF } from "@/lib/guide-pages";
import {
  FEEL_GOOD_HEADLINE,
  FEEL_GOOD_LEAD,
  HOME_DESCRIPTION,
  MAKER_SIGN,
  MAKER_WHY,
} from "@/lib/home-doors";
import { siteTitleMetadata } from "@/lib/site-title";

const TITLE = "How to feel good — GoodDayNight";

export const metadata: Metadata = {
  ...siteTitleMetadata,
  title: TITLE,
  description: HOME_DESCRIPTION,
  alternates: { canonical: "https://gooddaynight.com/how-to-feel-good" },
  openGraph: {
    type: "website",
    url: "https://gooddaynight.com/how-to-feel-good",
    title: TITLE,
    description: HOME_DESCRIPTION,
    locale: "en_US",
    siteName: "GoodDayNight",
  },
};

/** Behind the circle: the headline, the lead, Jasmine's why, and one Start button. */
export default function HowToFeelGoodPage() {
  return (
    <div className="page">
      <header className="site-header">
        <Link className="badge" href="/">
          GoodDayNight
        </Link>
      </header>

      <main id="main">
        <section className="card card--mint" aria-labelledby="feel-good-heading">
          <h1 id="feel-good-heading">{FEEL_GOOD_HEADLINE}</h1>
          <span className="card__mark" aria-hidden="true"></span>
          <span className="card__wash card__wash--sun" aria-hidden="true"></span>
        </section>

        <section className="card card--lavender home-lead">
          <p className="card__body">{FEEL_GOOD_LEAD}</p>
        </section>

        <section className="card card--cream feel-good-why" aria-labelledby="why-heading">
          <h2 id="why-heading">Why I built it</h2>
          <p className="card__body">{MAKER_WHY.join(" ")}</p>
          <p className="feel-good-why__sign">— {MAKER_SIGN}</p>
        </section>

        <nav className="feel-good-start" aria-label="Start">
          <Link className="step-next" href={WEAVE_HREF}>
            <span>Start my gratitude journal</span>
            <svg className="step-next__arrow" viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M5 12h13M13 6l6 6-6 6"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </Link>
        </nav>
      </main>

      <SiteFooter />
    </div>
  );
}
