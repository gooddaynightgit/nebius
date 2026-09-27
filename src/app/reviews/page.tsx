import GuideShell from "@/components/GuideShell";
import { guideMetadata, guideReviewLines } from "@/lib/guide-pages";

export const metadata = guideMetadata("/reviews");

export default function ReviewsPage() {
  const lines = guideReviewLines();
  return (
    <GuideShell>
      <section className="card card--cream" aria-labelledby="reviews-heading">
        <h1 id="reviews-heading">They bought before we asked.</h1>
        {lines.map((line) => (
          <blockquote className="guide-review" key={line.quote}>
            <p className="card__body">{line.quote}</p>
            <p className="guide-review__by">{line.attribution}</p>
          </blockquote>
        ))}
      </section>
    </GuideShell>
  );
}
