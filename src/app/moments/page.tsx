import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import MomentsCheckout from "@/components/MomentsCheckout";
import { isPersonalPhotoSession } from "@/lib/session";

export const metadata: Metadata = {
  title: "40 good moments — GoodDayNight",
  description: "Several good moments. 40 good moments — R450 ZAR · $28 USD. Not an archive.",
};

export const dynamic = "force-dynamic";

function queryValue(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

export default async function MomentsPage({
  searchParams,
}: {
  searchParams: Promise<{ paid?: string; cancelled?: string; ref?: string }>;
}) {
  if (!(await isPersonalPhotoSession())) redirect("/signin");

  const query = await searchParams;
  const paid = queryValue(query.paid) === "1";
  const cancelled = queryValue(query.cancelled) === "1";

  return (
    <div className="page moments-page">
      <header className="site-header">
        <Link className="badge" href="/">
          GoodDayNight
        </Link>
      </header>

      <main id="main">
        <section className="moments-waiting" aria-labelledby="moments-waiting">
          <h2 id="moments-waiting">Your good moments are waiting.</h2>
          <p>
            To capture one, begin your hunt below. Every photo you take becomes a story that's yours to keep.
          </p>
        </section>

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
          <h2 id="moments-is">several good moments — noticed, and kept so you can look back.</h2>
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
            Each moment: one photo upload → Create your story.
          </p>
          {paid ? (
            <p className="moments-status" role="status">
              Payfast sent you back. Continue on the <Link href="/app">photo page</Link>.
            </p>
          ) : null}
          {cancelled ? (
            <p className="moments-status" role="status">
              Checkout cancelled. Nothing was charged.
            </p>
          ) : null}
          <MomentsCheckout />
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
          <Link href="/">gooddaynight.com</Link>
        </p>
      </footer>
    </div>
  );
}
