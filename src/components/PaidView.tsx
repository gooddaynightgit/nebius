"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { STEP_LABEL } from "@/lib/journey";
import {
  PAID_CONFIRMING_LABEL,
  PAID_POLL_MS,
  PAID_SUCCESS_HEADING,
  PAID_UNLOCK_HREF,
  PAID_WAIT_MS,
  PAID_WEAVE_HREF,
} from "@/lib/paid-copy";

export function PaidSuccess() {
  return (
    <section className="card card--mint" aria-labelledby="paid-heading">
      <h1 id="paid-heading">{PAID_SUCCESS_HEADING}</h1>
      <p className="card__body">Your good moments are ready. Weave one whenever you like.</p>
      <Link className="step-next paid-weave" href={PAID_WEAVE_HREF}>
        {STEP_LABEL.start}
      </Link>
    </section>
  );
}

export function PaidConfirming({ orderRef }: { orderRef: string }) {
  const router = useRouter();

  useEffect(() => {
    let stopped = false;
    const started = Date.now();
    let timer = 0;

    const leave = () => {
      if (stopped) return;
      stopped = true;
      window.location.assign(PAID_UNLOCK_HREF);
    };

    const tick = async () => {
      if (stopped) return;
      if (Date.now() - started >= PAID_WAIT_MS) {
        leave();
        return;
      }
      try {
        const res = await fetch(`/api/payfast/paid?ref=${encodeURIComponent(orderRef)}`, {
          cache: "no-store",
          credentials: "same-origin",
        });
        const body = (await res.json()) as { status?: string };
        if (stopped) return;
        if (body.status === "complete") {
          stopped = true;
          router.refresh();
          return;
        }
        if (body.status !== "pending") {
          leave();
          return;
        }
      } catch {
        // The ITN can still land before the wait ends.
      }
      if (stopped || Date.now() - started >= PAID_WAIT_MS) {
        if (!stopped) leave();
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
  }, [orderRef, router]);

  return (
    <section className="card card--mint" aria-labelledby="paid-confirming">
      <h1 id="paid-confirming" className="paid-confirming" role="status">
        {PAID_CONFIRMING_LABEL}
      </h1>
      <p className="card__body">Your good moments are on their way.</p>
    </section>
  );
}
