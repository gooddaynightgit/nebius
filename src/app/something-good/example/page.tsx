import type { Metadata } from "next";
import { pageMetadata } from "@/lib/site-title";
import SgShell from "@/components/SgShell";
import { SG_EXAMPLE, SG_EXAMPLE_PATH } from "@/lib/something-good";

const TITLE = "Something Good example";
const DESCRIPTION = "One Something Good, start to finish: what was named, the perfect result, and the closing card.";

export const metadata: Metadata = pageMetadata({ name: TITLE, description: DESCRIPTION, path: SG_EXAMPLE_PATH });

export default function SgExamplePage() {
  return (
    <SgShell>
      <section className="card card--mint sg-info" aria-labelledby="sg-example-heading">
        <h1 id="sg-example-heading">Example</h1>
        <div className="sg-faq">
          <h2>She chose</h2>
          <p>{SG_EXAMPLE.chose}</p>
        </div>
        <div className="sg-faq">
          <h2>What she wasn&apos;t grateful for</h2>
          <p>{SG_EXAMPLE.notGrateful}</p>
          <p className="sg-info__note">She only thought about this. It isn&apos;t typed or said.</p>
        </div>
        <div className="sg-faq">
          <h2>Her perfect result</h2>
          <p className="sg-example__perfect">{SG_EXAMPLE.perfect}</p>
        </div>
      </section>
      <section className="card card--lavender sg-info" aria-labelledby="sg-example-card">
        <h2 id="sg-example-card" className="sg-info__note">Her last card</h2>
        <p className="sg-example__card">{SG_EXAMPLE.card}</p>
        <p className="sg-info__note">Alexa says only: &ldquo;Thank you.&rdquo; &hellip; &ldquo;Something good is happening.&rdquo;</p>
      </section>
    </SgShell>
  );
}
