import type { Metadata } from "next";
import SgShell from "@/components/SgShell";
import { SG_FAQ, SG_FAQ_PATH } from "@/lib/something-good";

const TITLE = "Something Good FAQ";
const DESCRIPTION = "Questions about Something Good: why start with what you're not grateful for, privacy, the mic, and support.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: `https://gooddaynight.com${SG_FAQ_PATH}` },
  openGraph: { title: TITLE, description: DESCRIPTION, url: `https://gooddaynight.com${SG_FAQ_PATH}` },
};

export default function SgFaqPage() {
  return (
    <SgShell>
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
