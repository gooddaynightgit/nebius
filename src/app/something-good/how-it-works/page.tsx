import type { Metadata } from "next";
import SgShell from "@/components/SgShell";
import { SG_HOW_NOTE, SG_HOW_PATH, SG_HOW_STEPS, sgHowToJsonLd, jsonLdHtml } from "@/lib/something-good";

const TITLE = "How Something Good works";
const DESCRIPTION =
  "Name what you're not grateful for, take one slow breath, turn it around into your perfect result, and hear: something good is about to happen.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: `https://gooddaynight.com${SG_HOW_PATH}` },
  openGraph: { title: TITLE, description: DESCRIPTION, url: `https://gooddaynight.com${SG_HOW_PATH}` },
};

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
