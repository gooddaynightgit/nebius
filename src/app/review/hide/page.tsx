import type { ReactNode } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import HideReviewButton from "@/components/HideReviewButton";
import SiteFooter from "@/components/SiteFooter";
import { REVIEW_HIDDEN } from "@/lib/review-copy";
import { openHideToken, readReview } from "@/lib/review";
import { firstNameOnly } from "@/lib/review-public";
import { otpSessionSecret } from "@/lib/otp-session";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Hide this review — GoodDayNight",
  robots: { index: false, follow: false },
};

export default async function HideReviewPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const token = (await searchParams).token?.trim() ?? "";
  const secret = otpSessionSecret();
  const id = secret && token ? openHideToken(token, secret) : null;
  const review = id ? await readReview(id) : null;

  let body: ReactNode;
  if (!review) {
    body = <p className="card__body">This link is not valid.</p>;
  } else if (!review.published) {
    body = (
      <p className="review-thanks" role="status">
        {REVIEW_HIDDEN}
      </p>
    );
  } else {
    body = (
      <>
        <p className="card__body">Hide this review from the site?</p>
        <article className="kind-words__card">
          <p className="kind-words__name">{review.stars} stars</p>
          {review.comment ? <p className="kind-words__comment">{review.comment}</p> : null}
          <p className="kind-words__name">{firstNameOnly(review.name)}</p>
        </article>
        <HideReviewButton token={token} />
      </>
    );
  }

  return (
    <div className="page review-page">
      <header className="site-header">
        <Link className="badge" href="/">
          GoodDayNight
        </Link>
      </header>
      <main id="main">
        <section className="card card--lavender card--compact" aria-labelledby="hide-heading">
          <h1 id="hide-heading">Hide this review</h1>
          {body}
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
