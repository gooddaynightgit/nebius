"use client";

import { useEffect } from "react";
import type { VerifiedPurchase } from "@/lib/google-ads";

const RETRY_MS = 250;
const MAX_ATTEMPTS = 40;

type Oaiq = (...args: unknown[]) => void;

function storageKey(transactionId: string): string {
  return `gdn:openai-ads:order:${transactionId}`;
}

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

/**
 * Sends OpenAI (ChatGPT) Ads `order_created` once per verified Payfast payment.
 * `amount` is an integer in minor units (cents); `event_id` is the Payfast payment id
 * so the same sale is never counted twice. Renders nothing.
 */
export function OpenAIAdsPurchase({ purchase }: { purchase: VerifiedPurchase }) {
  const { transactionId, value, currency } = purchase;

  useEffect(() => {
    if (!transactionId || !Number.isFinite(value) || value <= 0 || !/^[A-Z]{3}$/.test(currency)) return;
    const key = storageKey(transactionId);
    let cancelled = false;
    let attempts = 0;
    let timer = 0;

    const fire = () => {
      if (cancelled || alreadyRecorded(key)) return;
      const oaiq = (window as unknown as { oaiq?: Oaiq }).oaiq;
      if (typeof oaiq !== "function") {
        if (attempts >= MAX_ATTEMPTS) return;
        attempts += 1;
        timer = window.setTimeout(fire, RETRY_MS);
        return;
      }
      if (!recordPurchase(key)) return;
      try {
        oaiq(
          "measure",
          "order_created",
          {
            type: "contents",
            amount: Math.round(value * 100),
            currency,
            contents: [
              { id: "moments_pack", name: "GoodDayNight moments pack", content_type: "product", quantity: 1 },
            ],
          },
          { event_id: transactionId },
        );
      } catch {
        forgetPurchase(key);
      }
    };

    fire();
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [currency, transactionId, value]);

  return null;
}
