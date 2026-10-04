"use client";

import { useEffect } from "react";
import { adsPurchaseStorageKey, googleAdsPurchaseSendTo, type VerifiedPurchase } from "@/lib/google-ads";

const RETRY_MS = 250;
const MAX_ATTEMPTS = 40;

function alreadyRecorded(key: string): boolean {
  try {
    return window.localStorage.getItem(key) === "1" || window.sessionStorage.getItem(key) === "1";
  } catch {
    return true;
  }
}

function recordPurchase(key: string): boolean {
  try {
    if (alreadyRecorded(key)) return false;
    window.localStorage.setItem(key, "1");
    window.sessionStorage.setItem(key, "1");
    return true;
  } catch {
    forgetPurchase(key);
    return false;
  }
}

function forgetPurchase(key: string): void {
  try {
    window.localStorage.removeItem(key);
    window.sessionStorage.removeItem(key);
  } catch {
    // Storage is unavailable; the in-flight call already failed.
  }
}

/** Fires once per verified Payfast payment. Renders nothing. Does nothing when Ads is off. */
export function GoogleAdsPurchase({ purchase }: { purchase: VerifiedPurchase }) {
  const { transactionId, value, currency } = purchase;
  const sendTo = googleAdsPurchaseSendTo();

  useEffect(() => {
    if (!sendTo) return;
    if (!transactionId || !Number.isFinite(value) || value <= 0 || !/^[A-Z]{3}$/.test(currency)) return;
    const key = adsPurchaseStorageKey(transactionId);
    let cancelled = false;
    let attempts = 0;
    let timer = 0;

    const fire = () => {
      if (cancelled || alreadyRecorded(key)) return;
      const gtag = window.gtag;
      if (typeof gtag !== "function") {
        if (attempts >= MAX_ATTEMPTS) return;
        attempts += 1;
        timer = window.setTimeout(fire, RETRY_MS);
        return;
      }
      if (!recordPurchase(key)) return;
      try {
        gtag("event", "conversion", {
          send_to: sendTo,
          value,
          currency,
          transaction_id: transactionId,
        });
      } catch {
        forgetPurchase(key);
      }
    };

    fire();
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [currency, sendTo, transactionId, value]);

  return null;
}
