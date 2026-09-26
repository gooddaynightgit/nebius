import type { Metadata } from "next";
import Link from "next/link";
import ReviewForm from "@/components/ReviewForm";
import SiteFooter from "@/components/SiteFooter";
import { readGateEmail, readOtpSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Leave a review — GoodDayNight",
  description: "Leave a private note about GoodDayNight.",
};

async function signedInEmail(): Promise<string | null> {
  const otp = await readOtpSession();
  const gate = await readGateEmail();
  if (!otp || !gate || otp.email !== gate) return null;
  return gate;
}

export default async function ReviewPage() {
  const email = await signedInEmail();

  return (
    <div className="page review-page">
      <header className="site-header">
        <Link className="badge" href="/">
          GoodDayNight
        </Link>
      </header>

      <main id="main">
        <section className="card card--lavender card--compact" aria-labelledby="review-heading">
          <h1 id="review-heading">Leave a review</h1>
          <p className="card__body">A star or a few words is enough. Only we will read this.</p>
          <ReviewForm signedInEmail={email} />
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
