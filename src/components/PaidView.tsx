"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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

export function PaidSuccess() {
  return (
    <section className="card card--mint paid-card" aria-labelledby="paid-heading">
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
  const [settling, setSettling] = useState(false);

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
          router.refresh();
          return;
        }
        const body = (await res.json()) as { status?: string };
        if (body.status === "complete") {
          stopped = true;
          router.refresh();
          return;
        }
        if (body.status !== "pending") {
          stopped = true;
          router.refresh();
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
  }, [handoff, orderRef, router, settling]);

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
      <h1 id="paid-confirming" className="paid-confirming" role="status">
        {PAID_CONFIRMING_LABEL}
      </h1>
      <p className="card__body">Your good moments are on their way.</p>
    </section>
  );
}
