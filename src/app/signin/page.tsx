import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import SignInForm from "@/components/SignInForm";
import SiteFooter from "@/components/SiteFooter";
import { destinationForVerifiedEmail } from "@/lib/verified-destination";
import { isPersonalPhotoSession, readGateEmail } from "@/lib/session";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Sign in — GoodDayNight",
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
          <h1 id="signin-heading">Sign in</h1>
          <SignInForm />
        </section>
      </main>

      <SiteFooter site />
    </div>
  );
}
