import type { Metadata } from "next";
import LegalShell from "@/components/LegalShell";
import { pageMetadata } from "@/lib/site-title";

export const metadata: Metadata = pageMetadata({
  name: "Terms",
  description:
    "The simple terms for using GoodDayNight, the app for finding the joy in your day: who it is for, what a pack includes, and how to reach us.",
  path: "/terms",
});

export default function TermsPage() {
  return (
    <LegalShell id="terms-heading" title="Terms" updated="October 24, 2026">
      <h2>Who it’s for</h2>
      <p className="card__body">GoodDayNight is an app for adults 18 and over to find the joy in their day, or flip your day.</p>
      <h2>Your moments</h2>
      <p className="card__body">
        What you save stays yours. You give us permission to use it only to write and read back your story. Your moments
        are removed after 23:59 on your own day, so keep anything you want to remember somewhere of your own.
      </p>
      <h2>Packs and payment</h2>
      <p className="card__body">
        A pack is 25 good-day stories for $7.99 / R130, paid once through Payfast in USD or ZAR. It is not a subscription. If
        something goes wrong with a purchase, email us and we will make it right.
      </p>
      <h2>Using GoodDayNight kindly</h2>
      <p className="card__body">
        Please save only your own moments and photos you have the right to share. Stories are written with AI, so
        they may sometimes get a detail wrong. GoodDayNight is a journaling habit, not medical or mental health advice.
      </p>
      <h2>Changes</h2>
      <p className="card__body">We may update these terms. The date at the top shows the latest version.</p>
      <h2>Contact</h2>
      <p className="card__body">
        <a href="mailto:hello@gooddaynight.com">hello@gooddaynight.com</a>
      </p>
    </LegalShell>
  );
}
