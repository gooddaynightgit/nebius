import GuideShell from "@/components/GuideShell";
import { FAQ, guideMetadata } from "@/lib/guide-pages";

export const metadata = guideMetadata("/faq");

export default function FaqPage() {
  const [first, ...rest] = FAQ;
  return (
    <GuideShell>
      <section className="card card--cyan guide-faq" aria-labelledby="faq-heading">
        <h1 id="faq-heading">{first.q}</h1>
        <p className="card__body">{first.a}</p>
        {rest.map((item) => (
          <div key={item.q}>
            <h2>{item.q}</h2>
            <p className="card__body">{item.a}</p>
          </div>
        ))}
      </section>
    </GuideShell>
  );
}
