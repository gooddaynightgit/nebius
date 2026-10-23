import GuideShell from "@/components/GuideShell";
import { guideMetadata, PACK_BODY } from "@/lib/guide-pages";

export const metadata = guideMetadata("/pack");

export default function PackPage() {
  return (
    <GuideShell>
      <section className="card card--mint" aria-labelledby="pack-heading">
        <h1 id="pack-heading">25 moments. $7.99 / R130.</h1>
        <p className="card__body">{PACK_BODY}</p>
      </section>
    </GuideShell>
  );
}
