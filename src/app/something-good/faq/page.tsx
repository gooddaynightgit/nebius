import type { Metadata } from "next";
import { pageMetadata } from "@/lib/site-title";
import SgShell from "@/components/SgShell";
import { SG_FAQ, SG_FAQ_PATH, sgFaqJsonLd, jsonLdHtml } from "@/lib/something-good";

const TITLE = "Something Good FAQ";
const DESCRIPTION = "Questions about Something Good: why start with what you're not feeling good about, privacy, the mic, and support.";

export const metadata: Metadata = pageMetadata({ name: TITLE, description: DESCRIPTION, path: SG_FAQ_PATH });

export default function SgFaqPage() {
  return (
    <SgShell>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdHtml(sgFaqJsonLd()) }} />
      <section className="card card--cyan sg-info" aria-labelledby="sg-faq-heading">
        <h1 id="sg-faq-heading">FAQ</h1>
        {SG_FAQ.map((item) => (
          <div key={item.q} className="sg-faq">
            <h2>{item.q}</h2>
            <p>{item.a}</p>
          </div>
        ))}
      </section>
    </SgShell>
  );
}
