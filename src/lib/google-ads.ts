/**
 * Google tag IDs. Ads stays off until both public env vars are real.
 * Placeholders are never loaded or sent. GA4 keeps its existing property.
 */
export const GA4_MEASUREMENT_ID = "G-5NF1TLCWWL";
export const GOOGLE_ADS_ID_PLACEHOLDER = "AW-XXXXXXXXX";
export const GOOGLE_ADS_PURCHASE_LABEL_PLACEHOLDER = "XXXXXXXXXXX";

const ADS_ID_RE = /^AW-\d{6,20}$/;
const LABEL_RE = /^[A-Za-z0-9_-]{6,64}$/;
const CURRENCY_RE = /^[A-Z]{3}$/;
const ORDER_RE = /^[A-Za-z0-9_-]{1,80}$/;
const AMOUNT_RE = /^\d+(\.\d{1,2})?$/;

export type VerifiedPurchase = {
  /** Payfast `pf_payment_id` from the verified ITN. */
  transactionId: string;
  /** Major units (rands), not cents. */
  value: number;
  currency: string;
};

export type GoogleAdsConfig = {
  id: string;
  sendTo: string;
};

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

function clean(raw: string | undefined): string {
  return raw?.trim() ?? "";
}

/** A real Ads id, or null. The placeholder and anything non-numeric never pass. */
export function googleAdsId(raw = process.env.NEXT_PUBLIC_GOOGLE_ADS_ID): string | null {
  const value = clean(raw);
  if (!value || value === GOOGLE_ADS_ID_PLACEHOLDER) return null;
  return ADS_ID_RE.test(value) ? value : null;
}

/** The conversion label only. A full `AW-…/label` string is not accepted. */
export function googleAdsPurchaseLabel(raw = process.env.NEXT_PUBLIC_GOOGLE_ADS_PURCHASE_LABEL): string | null {
  const value = clean(raw);
  if (!value || value === GOOGLE_ADS_PURCHASE_LABEL_PLACEHOLDER) return null;
  if (/^X+$/.test(value)) return null;
  return LABEL_RE.test(value) ? value : null;
}

/** Both env vars must be valid. Otherwise Ads is fully off. */
export function googleAdsConfig(
  adsRaw = process.env.NEXT_PUBLIC_GOOGLE_ADS_ID,
  labelRaw = process.env.NEXT_PUBLIC_GOOGLE_ADS_PURCHASE_LABEL,
): GoogleAdsConfig | null {
  const id = googleAdsId(adsRaw);
  const label = googleAdsPurchaseLabel(labelRaw);
  if (!id || !label) return null;
  return { id, sendTo: `${id}/${label}` };
}

export function googleAdsPurchaseSendTo(
  adsRaw = process.env.NEXT_PUBLIC_GOOGLE_ADS_ID,
  labelRaw = process.env.NEXT_PUBLIC_GOOGLE_ADS_PURCHASE_LABEL,
): string | null {
  return googleAdsConfig(adsRaw, labelRaw)?.sendTo ?? null;
}

/** GA4 loader plus an Ads config line only when both ids are valid. */
export function googleTagSnippet(
  adsRaw = process.env.NEXT_PUBLIC_GOOGLE_ADS_ID,
  labelRaw = process.env.NEXT_PUBLIC_GOOGLE_ADS_PURCHASE_LABEL,
): { src: string; html: string } {
  const ads = googleAdsConfig(adsRaw, labelRaw);
  const adsConfig = ads ? `\ngtag('config', '${ads.id}');` : "";
  return {
    src: `https://www.googletagmanager.com/gtag/js?id=${GA4_MEASUREMENT_ID}`,
    html: `window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${GA4_MEASUREMENT_ID}');${adsConfig}`,
  };
}

export function adsPurchaseStorageKey(transactionId: string): string {
  return `gdn_gads_purchase:${transactionId}`;
}

/** Amount is already in major units (`130.00` ZAR). Reject anything else. */
export function purchaseFromStored(input: {
  pfPaymentId?: string;
  amount?: string;
  currency?: string;
}): VerifiedPurchase | null {
  const transactionId = input.pfPaymentId?.trim() ?? "";
  if (!ORDER_RE.test(transactionId)) return null;
  const currency = (input.currency ?? "").trim().toUpperCase();
  if (!CURRENCY_RE.test(currency)) return null;
  const amount = (input.amount ?? "").trim();
  if (!AMOUNT_RE.test(amount)) return null;
  const value = Number(amount);
  if (!Number.isFinite(value) || value <= 0) return null;
  return { transactionId, value, currency };
}

/** Poll JSON from `/api/payfast/paid`. Drops anything that is not a verified purchase. */
export function purchaseFromClient(value: unknown): VerifiedPurchase | null {
  if (!value || typeof value !== "object") return null;
  const row = value as { transactionId?: unknown; value?: unknown; currency?: unknown };
  if (typeof row.transactionId !== "string" || typeof row.currency !== "string" || typeof row.value !== "number") {
    return null;
  }
  if (!Number.isFinite(row.value) || row.value <= 0) return null;
  const cents = Math.round(row.value * 100);
  if (Math.abs(row.value * 100 - cents) > 0.001) return null;
  return purchaseFromStored({
    pfPaymentId: row.transactionId,
    amount: (cents / 100).toFixed(2),
    currency: row.currency,
  });
}
