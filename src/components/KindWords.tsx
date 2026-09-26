import Link from "next/link";
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
}: {
  reviews: PublicReview[];
  limit?: number;
  showLink?: boolean;
}) {
  const shown = typeof limit === "number" ? reviews.slice(0, limit) : reviews;
  if (shown.length === 0) return null;

  return (
    <section className="kind-words" aria-labelledby="kind-words-heading">
      <h2 id="kind-words-heading">{KIND_WORDS_HEADING}</h2>
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
    </section>
  );
}
