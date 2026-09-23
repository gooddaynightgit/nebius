import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "40 good moments — Gooddaynight",
  description: "One good moment a day. 40 good moments — R450 ZAR · $28 USD. Not an archive.",
};

export default function MomentsPage() {
  return (
    <div className="page moments-page">
      <header className="site-header">
        <Link className="badge" href="/">
          gooddaynight.com
        </Link>
      </header>

      <main id="main">
        <section className="moments-block moments-block--poster moments-block--night" aria-labelledby="moments-wound">
          <span className="moments-glyph" aria-hidden="true">
            1
          </span>
          <span className="moments-mark" aria-hidden="true"></span>
          <h1 id="moments-wound">The good in your own day dies unnoticed — every single night.</h1>
        </section>

        <section className="moments-block moments-block--poster moments-block--photo" aria-labelledby="moments-photo">
          <span className="moments-glyph" aria-hidden="true">
            1
          </span>
          <span className="moments-mark" aria-hidden="true"></span>
          <h2 id="moments-photo">
            Anyone can take a photo.
            <span className="moments-follow">GoodDayNight makes you notice what it was.</span>
          </h2>
        </section>

        <section className="moments-block moments-block--poster moments-block--lavender" aria-labelledby="moments-archive">
          <span className="moments-glyph" aria-hidden="true">
            ×
          </span>
          <p className="moments-kicker">Not</p>
          <h2 id="moments-archive">an archive of your life</h2>
        </section>

        <section className="moments-block moments-block--poster moments-block--violet" aria-labelledby="moments-chore">
          <span className="moments-glyph" aria-hidden="true">
            ×
          </span>
          <span className="moments-mark" aria-hidden="true"></span>
          <p className="moments-kicker">Not</p>
          <h2 id="moments-chore">another writing chore</h2>
        </section>

        <section className="moments-block moments-block--sheet moments-block--sheet-a" aria-labelledby="moments-charts">
          <p className="moments-kicker">Not</p>
          <h2 id="moments-charts">moods, streaks, or charts</h2>
        </section>

        <section className="moments-block moments-block--sheet moments-block--sheet-b" aria-labelledby="moments-audience">
          <p className="moments-kicker">Not</p>
          <h2 id="moments-audience">a performance for anyone else</h2>
        </section>

        <section className="moments-block moments-block--poster moments-block--yes" aria-labelledby="moments-is">
          <span className="moments-glyph" aria-hidden="true">
            1
          </span>
          <span className="moments-mark" aria-hidden="true"></span>
          <p className="moments-kicker">It is</p>
          <h2 id="moments-is">one good moment a day — noticed, here until midnight, then gone.</h2>
          <p className="moments-note">
            Share only if you want a card to keep. The habit of seeing stays.
          </p>
        </section>

        <section className="moments-block moments-block--poster moments-block--price" aria-labelledby="moments-price">
          <span className="moments-glyph moments-glyph--price" aria-hidden="true">
            R450 ZAR
          </span>
          <span className="moments-mark" aria-hidden="true"></span>
          <h2 id="moments-price">
            40 good moments — <span className="moments-price-pair">R450 ZAR · $28 USD</span>
          </h2>
          <p className="moments-note">
            Each moment: one photo upload → one My good moment story.
          </p>
          {/* TODO: swap this link for the moments-pack purchase when payment exists. */}
          <Link className="moments-cta" href="/app">
            Start hunting — R450 ZAR / $28 USD
          </Link>
          <p className="moments-aside">
            <em>40 moments. Yours to find — the finding changes you.</em>
          </p>
        </section>

        <section className="moments-block moments-block--close" aria-labelledby="moments-close">
          <h2 id="moments-close">Something good is about to happen!</h2>
        </section>
      </main>

      <footer className="site-footer">
        <p>
          <Link href="/">Gooddaynight.com</Link>
        </p>
      </footer>
    </div>
  );
}
