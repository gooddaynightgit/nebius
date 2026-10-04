"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { GoogleAdsPurchase } from "@/components/GoogleAdsPurchase";
import { googleAdsConfig, purchaseFromClient, type VerifiedPurchase } from "@/lib/google-ads";
import {
  PAID_APP_HREF,
  PAID_APP_LABEL,
  PAID_CONFIRMING_LABEL,
  PAID_POLL_MS,
  PAID_SETTLING_HEADING,
  PAID_SETTLING_LINE,
  PAID_SUCCESS_HEADING,
  PAID_SUCCESS_LINE,
  PAID_WAIT_MS,
} from "@/lib/paid-copy";

export function PaidSuccess({ purchase = null }: { purchase?: VerifiedPurchase | null }) {
  const track = purchase != null && googleAdsConfig() != null;
  return (
    <section className="card card--mint paid-card" aria-labelledby="paid-heading">
      {track && purchase ? <GoogleAdsPurchase purchase={purchase} /> : null}
      <h1 id="paid-heading">{PAID_SUCCESS_HEADING}</h1>
      <p className="card__body">{PAID_SUCCESS_LINE}</p>
      <Link className="paid-open" href={PAID_APP_HREF}>
        {PAID_APP_LABEL}
      </Link>
    </section>
  );
}

export function PaidConfirming({ orderRef, handoff }: { orderRef: string; handoff: string }) {
  const router = useRouter();
  const refresh = useRef(router.refresh);
  refresh.current = router.refresh;
  const [settling, setSettling] = useState(false);
  const [confirmed, setConfirmed] = useState<VerifiedPurchase | null>(null);

  useEffect(() => {
    if (settling) return;
    let stopped = false;
    const started = Date.now();
    let timer = 0;

    const tick = async () => {
      if (stopped) return;
      if (Date.now() - started >= PAID_WAIT_MS) {
        stopped = true;
        setSettling(true);
        return;
      }
      try {
        const params = new URLSearchParams({ ref: orderRef, handoff });
        const res = await fetch(`/api/payfast/paid?${params.toString()}`, {
          cache: "no-store",
          credentials: "same-origin",
        });
        if (stopped) return;
        if (res.status === 404) {
          stopped = true;
          refresh.current();
          return;
        }
        const body = (await res.json()) as { status?: string; purchase?: unknown };
        if (body.status === "complete") {
          stopped = true;
          const purchase = purchaseFromClient(body.purchase);
          if (purchase && googleAdsConfig()) setConfirmed(purchase);
          refresh.current();
          return;
        }
        if (body.status !== "pending") {
          stopped = true;
          refresh.current();
          return;
        }
      } catch {
        // The ITN can still land before the wait ends.
      }
      if (stopped) return;
      if (Date.now() - started >= PAID_WAIT_MS) {
        stopped = true;
        setSettling(true);
        return;
      }
      timer = window.setTimeout(() => {
        void tick();
      }, PAID_POLL_MS);
    };

    timer = window.setTimeout(() => {
      void tick();
    }, PAID_POLL_MS);
    return () => {
      stopped = true;
      window.clearTimeout(timer);
    };
  }, [handoff, orderRef, settling]);

  const track = confirmed != null && googleAdsConfig() != null;

  if (settling) {
    return (
      <section className="card card--mint paid-card" aria-labelledby="paid-settling">
        <h1 id="paid-settling">{PAID_SETTLING_HEADING}</h1>
        <p className="card__body">{PAID_SETTLING_LINE}</p>
      </section>
    );
  }

  return (
    <section className="card card--mint paid-card" aria-labelledby="paid-confirming">
      {track && confirmed ? <GoogleAdsPurchase purchase={confirmed} /> : null}
      <h1 id="paid-confirming" className="paid-confirming" role="status">
        {PAID_CONFIRMING_LABEL}
      </h1>
      <p className="card__body">Your good moments are on their way.</p>
    </section>
  );
}
