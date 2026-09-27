import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { PaidConfirming, PaidSuccess } from "@/components/PaidView";
import { PAID_UNLOCK_HREF, resolvePaidVisit } from "@/lib/paid-return";
import { readGateEmail, readOtpSession } from "@/lib/session";

export const metadata: Metadata = {
  title: "Your moments are unlocked — GoodDayNight",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

type PaidSearch = {
  ref?: string;
  handoff?: string;
};

export default async function PaidPage({
  searchParams,
}: {
  searchParams: Promise<PaidSearch>;
}) {
  const params = await searchParams;
  const ref = typeof params.ref === "string" ? params.ref : "";
  const handoff = typeof params.handoff === "string" ? params.handoff : "";
  if (handoff) {
    const next = new URLSearchParams();
    next.set("to", "paid");
    if (ref) next.set("ref", ref);
    next.set("handoff", handoff);
    redirect(`/api/auth/return?${next.toString()}`);
  }

  const otp = await readOtpSession();
  const gate = await readGateEmail();
  const email = otp && gate && otp.email === gate ? otp.email : null;
  const outcome = await resolvePaidVisit({ email, ref: ref || null });
  if (outcome.kind === "redirect") redirect(outcome.href);

  return (
    <div className="page paid-page">
      <header className="site-header">
        <Link className="badge" href="/">
          GoodDayNight
        </Link>
      </header>
      <main id="main">
        {outcome.kind === "success" ? <PaidSuccess /> : <PaidConfirming orderRef={outcome.ref} />}
      </main>
    </div>
  );
}
