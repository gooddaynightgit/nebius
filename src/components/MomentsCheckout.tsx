"use client";

import { journeyNextLabel } from "@/lib/journey";
import { useRegisterStepForward } from "@/components/step-forward";

/** Purchase only. The verified email is the session, not a field on this page. */
export default function MomentsCheckout() {
  useRegisterStepForward({
    label: journeyNextLabel(3) ?? "Capture it",
    enabled: true,
    run: () => {
      document.querySelector<HTMLFormElement>("#moments-buy")?.requestSubmit();
    },
  });
  return (
    <form id="moments-buy" className="moments-buy" method="post" action="/api/payfast/checkout">
      <button className="visually-hidden" type="submit">
        Unlock
      </button>
    </form>
  );
}
