import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import SignInForm from "@/components/SignInForm";
import { destinationForVerifiedEmail } from "@/lib/verified-destination";
import { isPersonalPhotoSession, readGateEmail } from "@/lib/session";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Your moment — GoodDayNight",
  description: "Email a code to open your moments.",
};

export default async function SignInPage() {
  if (await isPersonalPhotoSession()) {
    const email = await readGateEmail();
    redirect(email ? await destinationForVerifiedEmail(email) : "/moments");
  }

  return (
    <div className="page">
      <header className="site-header">
        <Link className="badge" href="/">
          GoodDayNight
        </Link>
      </header>

      <main id="main">
        <section className="signin-card" aria-labelledby="signin-heading">
          <h1 id="signin-heading">Your moment.</h1>
          <p className="signin-subline">
            Enter your email and we'll send a <span className="signin-keep">6-digit</span> code. No password, no account — your moments stay tied to you.
          </p>
          <SignInForm />
        </section>
      </main>

      <footer className="site-footer">
        <p>
          <Link href="/">gooddaynight.com</Link>
        </p>
      </footer>
    </div>
  );
}
