import GuideShell from "@/components/GuideShell";
import { guideMetadata, HOW_IT_WORKS_BODY } from "@/lib/guide-pages";

export const metadata = guideMetadata("/how-it-works");

export default function HowItWorksPage() {
  return (
    <GuideShell>
      <section className="card card--mint" aria-labelledby="how-it-works-heading">
        <h1 id="how-it-works-heading">Pick a moment. We write it.</h1>
        <p className="card__body">{HOW_IT_WORKS_BODY}</p>
      </section>
    </GuideShell>
  );
}
