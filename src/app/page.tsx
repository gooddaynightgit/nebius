import type { Metadata } from "next";
import Link from "next/link";
import HappyBubble from "@/components/HappyBubble";
import {
  FEEL_GOOD_HREF,
  FEEL_GOOD_LABEL,
  GOOD_NEWS_HREF,
  GOOD_NEWS_LABEL,
  HOME_DESCRIPTION,
  jsonLdHtml,
  siteJsonLd,
} from "@/lib/home-doors";
import { siteTitleMetadata } from "@/lib/site-title";

const HOME_TITLE = "GoodDayNight — How to feel good";

export const metadata: Metadata = {
  ...siteTitleMetadata,
  title: HOME_TITLE,
  description: HOME_DESCRIPTION,
  alternates: { canonical: "https://gooddaynight.com/" },
  openGraph: {
    type: "website",
    url: "https://gooddaynight.com/",
    title: HOME_TITLE,
    description: HOME_DESCRIPTION,
    locale: "en_US",
    siteName: "GoodDayNight",
  },
  twitter: {
    card: "summary_large_image",
    title: HOME_TITLE,
    description: HOME_DESCRIPTION,
  },
};

function Arrow() {
  return (
    <svg className="shape-cta__arrow" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M5 12h13M13 6l6 6-6 6"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Home: the brand circle, the brand square, and the bubble. Nothing else. */
export default function HomePage() {
  return (
    <div className="page home-doors-page">
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLdHtml(siteJsonLd(false))} />
      <header className="site-header">
        <Link className="badge" href="/">
          GoodDayNight
        </Link>
      </header>

      <main id="main">
        <h1 className="visually-hidden">GoodDayNight — how to feel good</h1>
        <nav className="home-doors" aria-label="GoodDayNight">
          <Link className="shape-cta shape-cta--circle" href={FEEL_GOOD_HREF}>
            <span className="shape-cta__core">
              <span className="shape-cta__main">{FEEL_GOOD_LABEL}</span>
              <Arrow />
            </span>
          </Link>
          <Link className="shape-cta shape-cta--square" href={GOOD_NEWS_HREF}>
            <span className="shape-cta__core">
              <span className="shape-cta__main">{GOOD_NEWS_LABEL}</span>
              <Arrow />
            </span>
          </Link>
        </nav>
        <HappyBubble text="Something good is happening!" />
      </main>
    </div>
  );
}
