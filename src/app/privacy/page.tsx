import type { Metadata } from "next";
import LegalShell from "@/components/LegalShell";
import { pageMetadata } from "@/lib/site-title";

export const metadata: Metadata = pageMetadata({
  name: "Privacy",
  description:
    "What GoodDayNight collects, how your saved moments are removed after 23:59 on your own day, and who to contact. We never sell your data.",
  path: "/privacy",
});

export default function PrivacyPage() {
  return (
    <LegalShell id="privacy-heading" title="Privacy" updated="October 24, 2026">
      <h2>What we collect</h2>
      <p className="card__body">
        Your email address, so we can send you a sign-in code. The moments you save: the text you write, any photo you
        add, and the good moments and audio we make from them. Your device’s date and time zone, so your day ends at your own
        midnight. If you buy a pack, a record that you paid. Our payment provider, Payfast, handles your card details;
        we never see them. If you leave a review, your words, star rating, and first name.
      </p>
      <h2>How we use it</h2>
      <p className="card__body">
        Only to run GoodDayNight: to sign you in, write your good moment, read it back to you, and unlock what you bought. Your
        text and photo are sent to our AI provider to write your good moment and are not used for anything else. We use Google
        Analytics and an OpenAI Ads pixel to understand visits and purchases.
      </p>
      <h2>How long we keep your moments</h2>
      <p className="card__body">
        Your saved moments last for your day. After 23:59 in your own time zone they no longer show, and the next time you
        open GoodDayNight they are deleted, including the photo and audio. A daily clean-up also deletes any moments from
        days that have ended everywhere in the world, even if you never come back.
      </p>
      <h2>What we never do</h2>
      <p className="card__body">We never sell your data, and we never share your moments with anyone.</p>
      <h2>Your choices</h2>
      <p className="card__body">
        You can ask us to delete your email, payment record, or review at any time. GoodDayNight is for adults 18 and over.
      </p>
      <h2>Contact</h2>
      <p className="card__body">
        <a href="mailto:hello@gooddaynight.com">hello@gooddaynight.com</a>
      </p>
    </LegalShell>
  );
}
