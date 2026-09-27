import GuideShell from "@/components/GuideShell";
import { guideMetadata, NOT_A_LIST_BODY, NOT_A_LIST_HEADLINE } from "@/lib/guide-pages";

export const metadata = guideMetadata("/not-a-list");

export default function NotAListPage() {
  return (
    <GuideShell>
      <section className="card card--lime" aria-labelledby="not-a-list-heading">
        <h1 id="not-a-list-heading">{NOT_A_LIST_HEADLINE}</h1>
        <p className="card__body">{NOT_A_LIST_BODY}</p>
      </section>
    </GuideShell>
  );
}
