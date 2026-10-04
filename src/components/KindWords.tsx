"use client";

import Link from "next/link";
import { useId, useState } from "react";
import { FEEDBACK_LINES } from "@/lib/feedback";
import { KIND_WORDS_HEADING } from "@/lib/review-copy";
import type { PublicReview } from "@/lib/review-public";

function LimeStars({ count }: { count: number }) {
  return (
    <p className="kind-words__stars" aria-label={`${count} ${count === 1 ? "star" : "stars"}`}>
      {[1, 2, 3, 4, 5].map((value) => (
        <svg key={value} className="kind-words__star" viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M12 2.6 14.7 8.7 21.3 9.4 16.4 14l1.4 6.5L12 17.4 6.2 20.5 7.6 14 2.7 9.4 9.3 8.7 12 2.6Z"
            fill={value <= count ? "#d4ff00" : "transparent"}
            stroke="#16324a"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
        </svg>
      ))}
    </p>
  );
}

export default function KindWords({
  reviews,
  limit,
  showLink = false,
  showFeedback = false,
}: {
  reviews: PublicReview[];
  limit?: number;
  showLink?: boolean;
  showFeedback?: boolean;
}) {
  const shown = typeof limit === "number" ? reviews.slice(0, limit) : reviews;
  const [open, setOpen] = useState(false);
  const panelId = useId();
  if (shown.length === 0 && !showFeedback) return null;

  return (
    <section className={open ? "kind-words is-open" : "kind-words"} aria-labelledby="kind-words-heading">
      <h2 id="kind-words-heading" className="kind-words__heading">
        {shown.length > 0 ? (
          <button
            className="kind-words__toggle"
            type="button"
            aria-expanded={open}
            aria-controls={panelId}
            onClick={() => setOpen((current) => !current)}
          >
            <span>{KIND_WORDS_HEADING}</span>
            <span className="kind-words__chevron" aria-hidden="true" />
          </button>
        ) : (
          <span className="kind-words__toggle">{KIND_WORDS_HEADING}</span>
        )}
      </h2>
      {showFeedback ? (
        <div className="kind-words__panel">
          <div className="kind-words__list">
            {FEEDBACK_LINES.map((line) => (
              <blockquote key={line.quote} className="card card--lavender card--compact">
                <p className="card__body">{line.quote}</p>
                <p className="card__body kind-words__name" style={{ marginTop: "0.45rem" }}>
                  <cite>{line.attribution}</cite>
                </p>
              </blockquote>
            ))}
          </div>
        </div>
      ) : null}
      {shown.length > 0 ? (
        <div className="kind-words__panel" id={panelId} hidden={!open}>
          <ul className="kind-words__list">
            {shown.map((review) => (
              <li key={review.id} className="kind-words__card">
                <LimeStars count={review.stars} />
                {review.comment ? <p className="kind-words__comment">{review.comment}</p> : null}
                <p className="kind-words__name">{review.name}</p>
              </li>
            ))}
          </ul>
          {showLink ? (
            <Link className="kind-words__link" href="/review">
              Leave a review
            </Link>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
