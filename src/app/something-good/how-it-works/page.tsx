import type { Metadata } from "next";
import { pageMetadata } from "@/lib/site-title";
import SgShell from "@/components/SgShell";
import { SG_HOW_NOTE, SG_HOW_PATH, SG_HOW_STEPS, sgHowToJsonLd, jsonLdHtml } from "@/lib/something-good";

const TITLE = "How Something Good works";
const DESCRIPTION =
  "Name what you're not feeling good about, take one slow breath, flip it into your perfect result, and hear: something good is happening.";

export const metadata: Metadata = pageMetadata({ name: TITLE, description: DESCRIPTION, path: SG_HOW_PATH });

export default function SgHowItWorksPage() {
  return (
    <SgShell>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdHtml(sgHowToJsonLd()) }} />
      <section className="card card--lavender sg-info" aria-labelledby="sg-how-heading">
        <h1 id="sg-how-heading">How it works</h1>
        <ol className="sg-steps">
          {SG_HOW_STEPS.map((step) => (
            <li key={step.title}>
              <h2>{step.title}</h2>
              <p>{step.body}</p>
            </li>
          ))}
        </ol>
        <p className="sg-info__note">{SG_HOW_NOTE}</p>
      </section>
    </SgShell>
  );
}
