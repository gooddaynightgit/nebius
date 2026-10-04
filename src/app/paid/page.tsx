import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PaidConfirming, PaidSuccess } from "@/components/PaidView";
import { resolvePaidVisit } from "@/lib/paid-return";
import { siteTitleMetadata } from "@/lib/site-title";

export const metadata: Metadata = {
  ...siteTitleMetadata,
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
  const outcome = await resolvePaidVisit({ ref: ref || null, handoff: handoff || null });
  if (outcome.kind === "missing") notFound();

  return (
    <div className="page paid-page">
      <main id="main">
        {outcome.kind === "success" ? (
          <PaidSuccess purchase={outcome.purchase} />
        ) : (
          <PaidConfirming orderRef={outcome.ref} handoff={outcome.handoff} />
        )}
      </main>
    </div>
  );
}
