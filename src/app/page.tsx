import type { Metadata } from "next";
import Link from "next/link";
import KindWords from "@/components/KindWords";
import SiteFooter from "@/components/SiteFooter";
import { STEP_LABEL } from "@/lib/journey";
import { KIND_WORDS_LIMIT } from "@/lib/review-copy";
import { listPublishedReviews } from "@/lib/review";
import { siteTitleMetadata } from "@/lib/site-title";

export const dynamic = "force-dynamic";

const HOME_TITLE = "GoodDayNight — Gratitude Journal & Bedtime Stories";
const HOME_DESCRIPTION =
  "GoodDayNight is a gratitude journal that turns every good moment you save today into its own bedtime story tonight. Save a text or photo, then listen.";

const HOME_FAQ = [
  {
    q: "What is GoodDayNight?",
    a: "GoodDayNight is a gratitude journal that turns every good moment you save today into its own bedtime story tonight.",
  },
  {
    q: "How does it work?",
    a: "Pick your joy, then capture it with a text or photo. GoodDayNight checks it understood your moment, and tonight it becomes your bedtime story.",
  },
  {
    q: "Can I save more than one moment a day?",
    a: "Yes. Save as many good moments as you like. Each one becomes its own story.",
  },
  {
    q: "What happens to my moments after tonight?",
    a: "Tonight's story, then it's gone. Tomorrow you look again.",
  },
  {
    q: "Does gratitude journaling really work?",
    a: "In a well-known study, people who wrote down three good things each night for a week felt happier for up to six months afterwards.",
  },
  {
    q: "Is my photo private?",
    a: "Your photos are used only to write your story and are deleted after tonight. We never share or sell them.",
  },
] as const;

export const metadata: Metadata = {
  ...siteTitleMetadata,
  title: HOME_TITLE,
  description: HOME_DESCRIPTION,
  openGraph: {
    type: "website",
    url: "https://gooddaynight.com/",
    title: HOME_TITLE,
    description: HOME_DESCRIPTION,
    locale: "en_US",
    siteName: "GoodDayNight",
  },
  twitter: {
    card: "summary",
    title: HOME_TITLE,
    description: HOME_DESCRIPTION,
  },
};

export default async function HomePage() {
  const reviews = await listPublishedReviews();
  return (
    <div className="page">
      <header className="site-header">
        <Link className="badge" href="/">
          GoodDayNight
        </Link>
      </header>

      <main id="main">
        <section className="card card--mint" aria-labelledby="hero-heading">
          <h1 id="hero-heading">
            You scrolled past a hundred good moments today. None of them were yours.
          </h1>
          <span className="card__mark" aria-hidden="true"></span>
          <span className="card__wash card__wash--sun" aria-hidden="true"></span>
        </section>

        <section className="card card--summary">
          <p className="card__body">
            GoodDayNight is a gratitude journal that turns every good moment you save today into its own bedtime story tonight.
          </p>
        </section>

        <section className="card card--lavender">
          <p className="card__body">
            Your laugh. Your small win. Your quiet moment. Nobody turned them
            into anything — not even you.
          </p>
          <span className="card__wash card__wash--ten" aria-hidden="true"></span>
        </section>

        <nav className="step-nav" aria-label={STEP_LABEL.start}>
          <Link className="step-next step-pin" href="/app/joy">
            {STEP_LABEL.start}
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

        <section className="landing-demo-block" aria-labelledby="landing-demo-heading">
          <h2 id="landing-demo-heading" className="landing-demo__heading">
            How I weaved my good moment
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
            height={1198}
            aria-label="Demo of weaving a good moment"
          />
        </section>

        <KindWords reviews={reviews} limit={KIND_WORDS_LIMIT} showLink showFeedback />

        <section className="card card--cream home-study" aria-labelledby="study-heading">
          <h2 id="study-heading">Letting the habit of looking rewire how I feel</h2>
          <p className="card__body" style={{ marginTop: "0.85rem" }}>
            In a well-known study, people who wrote down three good things each night for one week felt happier, and the effect lasted up to six months. GoodDayNight builds on that same simple habit: notice what went well today, save it, and hear it back as a bedtime story tonight.
          </p>
          <a
            className="private-note paid-open"
            href="https://doi.org/10.1037/0003-066X.60.5.410"
            target="_blank"
            rel="noopener noreferrer"
          >
            Seligman, Steen, Park &amp; Peterson (2005), &quot;Positive psychology progress: Empirical validation of interventions,&quot; American Psychologist.
          </a>
          <span className="card__wash card__wash--note" aria-hidden="true"></span>
        </section>

        <section className="card card--peach home-questions" aria-labelledby="questions-heading">
          <h2 id="questions-heading">Questions</h2>
          {HOME_FAQ.map((item) => (
            <div key={item.q}>
              <h3>{item.q}</h3>
              <p className="card__body">{item.a}</p>
            </div>
          ))}
          <span className="card__wash card__wash--plus" aria-hidden="true"></span>
        </section>

        <section className="card card--lime home-close" aria-labelledby="closing-heading">
          <h2 id="closing-heading">Something good is about to happen!</h2>
          <Link className="step-next" href="/app/joy">
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
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
