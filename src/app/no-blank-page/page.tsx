import GuideShell from "@/components/GuideShell";
import { guideMetadata, NO_BLANK_PAGE_BODY } from "@/lib/guide-pages";

export const metadata = guideMetadata("/no-blank-page");

export default function NoBlankPage() {
  return (
    <GuideShell>
      <section className="card card--lavender" aria-labelledby="no-blank-heading">
        <h1 id="no-blank-heading">You never start from an empty page.</h1>
        <p className="card__body">{NO_BLANK_PAGE_BODY}</p>
      </section>
    </GuideShell>
  );
}
