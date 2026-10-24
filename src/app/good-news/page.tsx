import type { Metadata } from "next";
import Link from "next/link";
import KindWords from "@/components/KindWords";
import SiteFooter from "@/components/SiteFooter";
import { WEAVE_HREF } from "@/lib/guide-pages";
import {
  FEEL_GOOD_HEADLINE,
  FEEL_GOOD_LABEL,
  FEEL_GOOD_LEAD,
  GOOD_NEWS_FAQ,
  HOME_DESCRIPTION,
  jsonLdHtml,
  siteJsonLd,
} from "@/lib/home-doors";
import { KIND_WORDS_LIMIT } from "@/lib/review-copy";
import { listPublishedReviews } from "@/lib/review";
import { siteTitleMetadata } from "@/lib/site-title";

export const revalidate = 300;

const TITLE = "Good news about gratitude — GoodDayNight";
const DESCRIPTION =
  "Good news: gratitude really does make you feel good. The Three Good Things study, kind words from people using GoodDayNight, and answers to common questions.";

export const metadata: Metadata = {
  ...siteTitleMetadata,
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "https://gooddaynight.com/good-news" },
  openGraph: {
    type: "website",
    url: "https://gooddaynight.com/good-news",
    title: TITLE,
    description: DESCRIPTION,
    locale: "en_US",
    siteName: "GoodDayNight",
  },
};

function Arrow() {
  return (
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
  );
}

/** Behind the square: all the words: why, demo, study, reviews, FAQ. */
export default async function GoodNewsPage() {
  const reviews = await listPublishedReviews(KIND_WORDS_LIMIT);
  return (
    <div className="page">
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLdHtml(siteJsonLd(true))} />
      <header className="site-header">
        <Link className="badge" href="/">
          GoodDayNight
        </Link>
      </header>

      <main id="main">
        <section className="card card--mint" aria-labelledby="good-news-heading">
          <h1 id="good-news-heading">Good news: gratitude really does make you feel good.</h1>
          <p className="card__body">{HOME_DESCRIPTION}</p>
        </section>

        <section className="card card--lavender home-lead" aria-labelledby="scrolled-heading">
          <h2 id="scrolled-heading">{FEEL_GOOD_HEADLINE}</h2>
          <p className="card__body" style={{ marginTop: "0.85rem" }}>
            {FEEL_GOOD_LEAD}
          </p>
        </section>

        <section className="landing-demo-block" aria-labelledby="landing-demo-heading">
          <h2 id="landing-demo-heading" className="landing-demo__heading">
            {FEEL_GOOD_LABEL}
          </h2>
          <video
            className="landing-demo"
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            poster="/landing-demo-poster.jpg"
            src="/landing-demo.mp4"
            width={720}
            height={1398}
            aria-label="Demo of how to feel good with GoodDayNight"
          />
        </section>

        <section className="card card--cream home-study" aria-labelledby="study-heading">
          <h2 id="study-heading">Letting the habit of looking rewire how I feel</h2>
          <p className="card__body" style={{ marginTop: "0.85rem" }}>
            In a well-known study, people who wrote down three good things each night for one week felt happier, and the effect lasted up to six months. GoodDayNight builds on that same simple habit: notice what went well today, save it, and get it reflected back to you in a few warm words.
          </p>
          <a
            className="private-note paid-open"
            href="https://doi.org/10.1037/0003-066X.60.5.410"
            target="_blank"
            rel="noopener noreferrer"
          >
            Seligman, Steen, Park &amp; Peterson (2005), &quot;Positive psychology progress: Empirical validation of interventions,&quot; American Psychologist, 60(5), 410–421. The &quot;Three Good Things&quot; exercise.
          </a>
          <span className="card__wash card__wash--note" aria-hidden="true"></span>
        </section>

        <KindWords reviews={reviews} limit={KIND_WORDS_LIMIT} showLink showFeedback />

        <section className="card card--peach home-questions" aria-labelledby="questions-heading">
          <h2 id="questions-heading">Questions</h2>
          {GOOD_NEWS_FAQ.map((item) => (
            <div key={item.q}>
              <h3>{item.q}</h3>
              <p className="card__body">{item.a}</p>
            </div>
          ))}
          <span className="card__wash card__wash--plus" aria-hidden="true"></span>
        </section>

        <section className="card card--lime home-close" aria-labelledby="closing-heading">
          <h2 id="closing-heading" className="visually-hidden">
            Something good is happening!
          </h2>
          <Link className="step-next" href={WEAVE_HREF}>
            <span>Start my feel good moment</span>
            <Arrow />
          </Link>
          <p className="home-close__or">OR</p>
          <Link className="step-next home-close__turn" href="/something-good">
            <span className="home-close__turn-text">
              <span className="home-close__kicker">Name what you&apos;re not feeling good about, then</span>
              <span>Flip it</span>
            </span>
            <Arrow />
          </Link>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
