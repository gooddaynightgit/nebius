import GuideShell from "@/components/GuideShell";
import { EXAMPLE_CLOSING, EXAMPLE_NOTE, EXAMPLE_PHOTO, EXAMPLE_STORY, guideMetadata } from "@/lib/guide-pages";

export const metadata = guideMetadata("/example");

export default function ExamplePage() {
  return (
    <GuideShell>
      <section className="card card--peach" aria-labelledby="example-heading">
        <h1 id="example-heading">This is what a kept moment reads like.</h1>
      </section>
      <section className="card card--lavender card--compact guide-story" aria-label="A kept moment">
        <img className="keep-card-view" src={EXAMPLE_PHOTO} alt="A bitten chocolate held in the sun" />
        <p className="card__body weaved-story">
          {EXAMPLE_STORY}
          {"\n\n"}
          <span className="weaved-affirmation">{EXAMPLE_CLOSING}</span>
        </p>
      </section>
      <section className="card card--cream">
        <p className="card__body">{EXAMPLE_NOTE}</p>
      </section>
    </GuideShell>
  );
}
