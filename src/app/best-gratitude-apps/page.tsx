import type { Metadata } from "next";
import Link from "next/link";
import GuideShell from "@/components/GuideShell";
import { pageMetadata } from "@/lib/site-title";

const PATH = "/best-gratitude-apps";
const TITLE = "Best gratitude apps in 2026";
const DESCRIPTION =
  "An honest guide to the best gratitude apps in 2026, from full journals to quick daily lists, plus GoodDayNight for one feel-good moment made right now.";

export const metadata: Metadata = pageMetadata({ name: TITLE, description: DESCRIPTION, path: PATH });

const GLANCE: { app: string; best: string }[] = [
  { app: "GoodDayNight", best: "One good moment, made into something you feel right now. Works in your browser, nothing to download." },
  { app: "Gratitude: Self-Care Journal", best: "An all-in-one app with journal, affirmations and vision boards." },
  { app: "Presently", best: "A quiet, ad-free gratitude list on Android." },
  { app: "Five Minute Journal", best: "A short guided routine, morning and evening." },
  { app: "Day One", best: "People who want gratitude as part of a bigger journal." },
  { app: "365 Gratitude", best: "Structured positive-psychology exercises and community." },
  { app: "Happyfeed", best: "Recording the good things in each day." },
];

const OTHERS: { name: string; body: string }[] = [
  {
    name: "Gratitude: Self-Care Journal",
    body: "A popular all-rounder with a journal, voice entries, prompts, affirmations and vision boards. Free to download. A good fit if you want many self-care tools in one place.",
  },
  {
    name: "Presently",
    body: "A free, ad-free gratitude journal for Android with a deliberately plain design. Ideal if you want a simple list and nothing else.",
  },
  {
    name: "Five Minute Journal",
    body: "The app version of the well-known paper journal, with guided questions to start and end the day. Good for beginners who like structure.",
  },
  {
    name: "Day One",
    body: "A full-featured journaling app with prompts, tags and photos. Gratitude is one part of it rather than the focus. A strong choice if you also write long entries.",
  },
  {
    name: "365 Gratitude",
    body: "Built on positive-psychology principles, with a large community. It has a free trial, then a subscription.",
  },
  {
    name: "Happyfeed",
    body: "A gratitude journal for recording the good things that happen each day.",
  },
];

const CHOOSE: string[] = [
  "Want many tools? Gratitude: Self-Care Journal or Day One.",
  "Want a simple list? Presently.",
  "Want structure? Five Minute Journal or 365 Gratitude.",
  "Want one good moment you can feel right now, with nothing to download? GoodDayNight.",
];

const FAQ: { q: string; a: string }[] = [
  {
    q: "Do gratitude apps work?",
    a: "Yes, when you come back to them. The research links regular gratitude practice to better mood and lower stress. The app's job is to make returning easy.",
  },
  {
    q: "What if I can't think of anything to be grateful for?",
    a: "GoodDayNight's Something Good page is made for exactly that. Name what you're not feeling good about, and flip it.",
  },
  {
    q: "Is there a free gratitude app?",
    a: "Presently is free. GoodDayNight's first moment is free.",
  },
  {
    q: "Is there a gratitude app I don't have to download?",
    a: "Yes. GoodDayNight works in any phone browser at gooddaynight.com, so there's nothing to install.",
  },
];

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQ.map((item) => ({
    "@type": "Question",
    name: item.q,
    acceptedAnswer: { "@type": "Answer", text: item.a },
  })),
};

export default function BestGratitudeAppsPage() {
  return (
    <GuideShell>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd).replace(/</g, "\\u003c") }}
      />

      <section className="card card--lime" aria-labelledby="best-heading">
        <h1 id="best-heading">{TITLE}</h1>
        <p className="card__body">
          The best gratitude app is the one you'll open again. Some people like a full journal and some like a quick
          list. Some want one good moment, felt properly. Here's how the popular gratitude apps compare, so you can
          pick the one that fits you.
        </p>
      </section>

      <section className="card card--cream" aria-labelledby="glance-heading">
        <h2 id="glance-heading">At a glance</h2>
        <ul className="card__body">
          {GLANCE.map((row) => (
            <li key={row.app}>
              <strong>{row.app}:</strong> {row.best}
            </li>
          ))}
        </ul>
      </section>

      <section className="card card--mint" aria-labelledby="gdn-heading">
        <h2 id="gdn-heading">GoodDayNight: for one good moment</h2>
        <p className="card__body">
          Most gratitude apps ask for a list. GoodDayNight asks for one moment. You name something good from today,
          add a photo or your voice if you like, and GoodDayNight turns it into something you can feel right now.
        </p>
        <p className="card__body">We all scroll to feel good. A good moment that's yours does it better.</p>
        <ul className="card__body">
          <li>
            <strong>One moment, not a list:</strong> no pressure to find three things.
          </li>
          <li>
            <strong>Feel good visual and voice:</strong> capture it the way it happened.
          </li>
          <li>
            <strong>Something Good:</strong> when nothing comes to mind, name what you're not feeling good about and{" "}
            <Link href="/something-good">flip it</Link>.
          </li>
          <li>
            <strong>Nothing to download:</strong> it works in any phone browser.
          </li>
          <li>
            <strong>Try it free:</strong> your first moment is on us.
          </li>
        </ul>
      </section>

      {OTHERS.map((app) => (
        <section key={app.name} className="card card--aqua">
          <h2>{app.name}</h2>
          <p className="card__body">{app.body}</p>
        </section>
      ))}

      <section className="card card--lavender" aria-labelledby="choose-heading">
        <h2 id="choose-heading">How to choose</h2>
        <ul className="card__body">
          {CHOOSE.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </section>

      <section className="card card--cyan" aria-labelledby="faq-heading">
        <h2 id="faq-heading">Questions</h2>
        {FAQ.map((item) => (
          <div key={item.q}>
            <h3>{item.q}</h3>
            <p className="card__body">{item.a}</p>
          </div>
        ))}
      </section>
    </GuideShell>
  );
}
