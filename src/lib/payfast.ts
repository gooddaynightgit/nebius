import { createHash, timingSafeEqual } from "node:crypto";
import { emailVaultId, isValidEmail, newId, normalizeEmail } from "./identity";
import { creditMoments, recordedPayment } from "./entitlement";

/**
 * Payfast checkout + ITN.
 *
 * Checkout signs non-blank fields in documented attribute order (not
 * alphabetical), trims values, then PHP-style urlencode and a lowercase MD5.
 * https://developers.payfast.co.za/docs#step_2_create_security_signature
 *
 * The ITN signature is a different string. Payfast's notify sample walks the
 * posted fields in received order, urlencodes every value including blanks
 * (`name_last=&custom_str2=`), and stops at `signature`. Skipping blanks
 * makes a live notify fail closed before the `goodfans` credit.
 * https://developers.payfast.co.za/docs#step_4_confirm_payment
 */
export const FIELD_ORDER = [
  "merchant_id",
  "merchant_key",
  "return_url",
  "cancel_url",
  "notify_url",
  "name_first",
  "name_last",
  "email_address",
  "cell_number",
  "m_payment_id",
  "amount",
  "item_name",
  "item_description",
  "custom_int1",
  "custom_int2",
  "custom_int3",
  "custom_int4",
  "custom_int5",
  "custom_str1",
  "custom_str2",
  "custom_str3",
  "custom_str4",
  "custom_str5",
  "email_confirmation",
  "confirmation_address",
  "payment_method",
] as const;

/**
 * Payfast charge for Jasmine’s live R5 test. The `/moments` price block stays
 * “40 good moments — R450 ZAR · $28 USD”. Do not print this amount there.
 */
export const PACK_AMOUNT = "5.00";
export const PACK_MOMENTS = 40;
export const ITEM_NAME = "GoodDayNight — 40 good moments";
export const ITEM_DESCRIPTION =
  "Each moment: one photo upload → one My good moment story.";

const PACK_CENTS = 500;

export type PayfastMerchant = {
  merchantId: string;
  merchantKey: string;
  passphrase: string;
};

export type CheckoutFieldMap = Record<string, string>;

/**
 * Live Payfast (`www.payfast.co.za`) unless SANDBOX is explicitly on.
 * Preview for this R5 test uses the live PF_* keys with SANDBOX unset or false.
 */
export function payfastSandbox(): boolean {
  const raw = process.env.SANDBOX;
  if (raw == null || raw.trim() === "") return false;
  return ["1", "true", "yes", "on"].includes(raw.trim().toLowerCase());
}

export function payfastHost(): string {
  return payfastSandbox() ? "sandbox.payfast.co.za" : "www.payfast.co.za";
}

export function payfastProcessUrl(): string {
  return `https://${payfastHost()}/eng/process`;
}

export function payfastValidateUrl(): string {
  return `https://${payfastHost()}/eng/query/validate`;
}

export function payfastMerchant(): PayfastMerchant | null {
  const merchantId = process.env.PF_MERCHANT_ID?.trim() ?? "";
  const merchantKey = process.env.PF_MERCHANT_KEY?.trim() ?? "";
  const passphrase = process.env.PF_PASSPHRASE?.trim() ?? "";
  if (!merchantId || !merchantKey || !passphrase) return null;
  return { merchantId, merchantKey, passphrase };
}

/** Public origin for return, cancel, and notify. APP_URL, else VERCEL_URL. */
export function publicOrigin(): string {
  const app = process.env.APP_URL?.trim();
  if (app) return app.replace(/\/+$/, "");
  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) {
    const host = vercel.replace(/^https?:\/\//, "").replace(/\/+$/, "");
    return `https://${host}`;
  }
  return "http://localhost:3000";
}

/**
 * PHP `urlencode` / Python `quote_plus(value, safe="")`, with uppercase hex.
 * Spaces become `+`. Letters, digits, and `_.-` stay literal.
 * Does not trim: the ITN sample calls `urlencode($val)` on the posted value.
 */
function pfEncodePhp(value: string): string {
  let out = "";
  for (const char of value) {
    if (/[A-Za-z0-9._-]/.test(char)) {
      out += char;
      continue;
    }
    if (char === " ") {
      out += "+";
      continue;
    }
    const bytes = Buffer.from(char, "utf8");
    for (const byte of bytes) {
      out += `%${byte.toString(16).toUpperCase().padStart(2, "0")}`;
    }
  }
  return out;
}

/** Checkout encoding. Trims, then PHP `urlencode`. */
export function pfEncode(value: string): string {
  return pfEncodePhp(value.trim());
}

function withPassphrase(payload: string, passphrase: string): string {
  const phrase = passphrase.trim();
  if (!phrase) return payload;
  const suffix = `passphrase=${pfEncodePhp(phrase)}`;
  return payload ? `${payload}&${suffix}` : suffix;
}

/**
 * Checkout / blank-skipping signature string. Empty values are omitted.
 * `signature` is ignored wherever it sits; later fields are still signed.
 */
export function signaturePayload(pairs: Array<[string, string]>, passphrase: string): string {
  const parts: string[] = [];
  for (const [key, raw] of pairs) {
    if (key === "signature") continue;
    const value = raw.trim();
    if (!value) continue;
    parts.push(`${key}=${pfEncodePhp(value)}`);
  }
  return withPassphrase(parts.join("&"), passphrase);
}

/**
 * ITN signature string from Payfast's notify sample: every posted field in
 * received order, including blanks, and nothing after `signature`.
 */
export function itnSignaturePayload(pairs: Array<[string, string]>, passphrase: string): string {
  const parts: string[] = [];
  for (const [key, raw] of pairs) {
    if (key === "signature") break;
    parts.push(`${key}=${pfEncodePhp(raw)}`);
  }
  return withPassphrase(parts.join("&"), passphrase);
}

export function md5Hex(payload: string): string {
  return createHash("md5").update(payload, "utf8").digest("hex");
}

export function signPairs(pairs: Array<[string, string]>, passphrase: string): string {
  return md5Hex(signaturePayload(pairs, passphrase));
}

export function checkoutPairs(fields: CheckoutFieldMap): Array<[string, string]> {
  const pairs: Array<[string, string]> = [];
  for (const key of FIELD_ORDER) {
    const raw = fields[key];
    if (raw == null) continue;
    const value = String(raw).trim();
    if (!value) continue;
    pairs.push([key, value]);
  }
  return pairs;
}

export function signCheckout(fields: CheckoutFieldMap, passphrase: string): string {
  return signPairs(checkoutPairs(fields), passphrase);
}

export function parseFormPairs(raw: string): Array<[string, string]> {
  const pairs: Array<[string, string]> = [];
  if (!raw) return pairs;
  for (const part of raw.split("&")) {
    if (!part) continue;
    const eq = part.indexOf("=");
    const key = decodeFormComponent(eq === -1 ? part : part.slice(0, eq));
    const value = decodeFormComponent(eq === -1 ? "" : part.slice(eq + 1));
    pairs.push([key, value]);
  }
  return pairs;
}

function decodeFormComponent(value: string): string {
  try {
    return decodeURIComponent(value.replace(/\+/g, " "));
  } catch {
    return value.replace(/\+/g, " ");
  }
}

export function signaturesMatch(given: string, expected: string): boolean {
  const left = Buffer.from(given.trim().toLowerCase());
  const right = Buffer.from(expected.trim().toLowerCase());
  if (left.length === 0 || left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

/** At least 5.00 ZAR credits 40 moment saves. Below 5.00 credits 0. */
export function momentsForAmount(amount: string | number): number {
  const cents = zarToCents(amount);
  if (cents == null || cents < PACK_CENTS) return 0;
  return PACK_MOMENTS;
}

export function zarToCents(amount: string | number): number | null {
  const raw = String(amount).trim();
  if (!/^\d+(\.\d{1,2})?$/.test(raw)) return null;
  const [whole, frac = ""] = raw.split(".");
  const cents = Number(whole) * 100 + Number((frac + "00").slice(0, 2));
  if (!Number.isSafeInteger(cents)) return null;
  return cents;
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function renderAutoSubmitForm(action: string, fields: CheckoutFieldMap): string {
  const inputs = Object.entries(fields)
    .map(
      ([name, value]) =>
        `<input type="hidden" name="${escapeHtml(name)}" value="${escapeHtml(value)}" />`,
    )
    .join("");
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Continue to Payfast</title>
</head>
<body>
  <form id="payfast-checkout" action="${escapeHtml(action)}" method="post">
    ${inputs}
    <noscript><button type="submit">Continue to Payfast</button></noscript>
  </form>
  <script>document.getElementById("payfast-checkout").submit();</script>
</body>
</html>`;
}

export function buildCheckoutFields(email: string, mPaymentId: string): CheckoutFieldMap | null {
  const merchant = payfastMerchant();
  const normalized = normalizeEmail(email);
  if (!merchant || !isValidEmail(normalized)) return null;
  const origin = publicOrigin();
  const ref = encodeURIComponent(mPaymentId);
  return {
    merchant_id: merchant.merchantId,
    merchant_key: merchant.merchantKey,
    return_url: `${origin}/app?paid=1&ref=${ref}`,
    cancel_url: `${origin}/moments?cancelled=1`,
    notify_url: `${origin}/api/payfast/itn`,
    email_address: normalized,
    m_payment_id: mPaymentId,
    amount: PACK_AMOUNT,
    item_name: ITEM_NAME,
    item_description: ITEM_DESCRIPTION,
    custom_str1: emailVaultId(normalized),
    // Payfast may replace email_address with the payer's account email.
    // custom_str2 is the order email we signed; the ITN credits this address.
    custom_str2: normalized,
  };
}

export type CheckoutResult =
  | { ok: true; status: 200; html: string }
  | { ok: false; status: 400 | 500; message: string };

export function createCheckout(email: string): CheckoutResult {
  const normalized = normalizeEmail(email);
  if (!isValidEmail(normalized)) {
    return { ok: false, status: 400, message: "Enter a valid email." };
  }
  if (!payfastMerchant()) {
    return { ok: false, status: 500, message: "Payfast is not configured." };
  }
  const mPaymentId = newId("pay");
  const fields = buildCheckoutFields(normalized, mPaymentId);
  const merchant = payfastMerchant();
  if (!fields || !merchant) {
    return { ok: false, status: 500, message: "Payfast is not configured." };
  }
  const signed: CheckoutFieldMap = {
    ...orderedCheckoutFields(fields),
    signature: signCheckout(fields, merchant.passphrase),
  };
  console.info(
    `[payfast] test charge amount=${PACK_AMOUNT} ZAR credits=${PACK_MOMENTS} display remains R450`,
  );
  return {
    ok: true,
    status: 200,
    html: renderAutoSubmitForm(payfastProcessUrl(), signed),
  };
}

function orderedCheckoutFields(fields: CheckoutFieldMap): CheckoutFieldMap {
  const ordered: CheckoutFieldMap = {};
  for (const [key, value] of checkoutPairs(fields)) ordered[key] = value;
  return ordered;
}

export function checkoutHealth(): {
  ok: true;
  sandbox: boolean;
  configured: boolean;
  amount: typeof PACK_AMOUNT;
  moments: typeof PACK_MOMENTS;
  processHost: string;
  notifyPath: "/api/payfast/itn";
} {
  return {
    ok: true,
    sandbox: payfastSandbox(),
    configured: Boolean(payfastMerchant()),
    amount: PACK_AMOUNT,
    moments: PACK_MOMENTS,
    processHost: payfastHost(),
    notifyPath: "/api/payfast/itn",
  };
}

export type ItnDecision =
  | {
      ok: true;
      email: string;
      pfPaymentId: string;
      amountGross: string;
      moments: number;
    }
  | { ok: false; reason: string };

export function decideItn(rawBody: string, passphrase: string, merchantId: string): ItnDecision {
  const pairs = parseFormPairs(rawBody);
  const data = new Map<string, string>();
  for (const [key, value] of pairs) data.set(key, value);
  const given = data.get("signature") ?? "";
  const documented = md5Hex(itnSignaturePayload(pairs, passphrase));
  const blankSkipping = signPairs(pairs, passphrase);
  if (!signaturesMatch(given, documented) && !signaturesMatch(given, blankSkipping)) {
    return { ok: false, reason: "signature" };
  }
  if ((data.get("merchant_id") ?? "").trim() !== merchantId.trim()) {
    return { ok: false, reason: "merchant" };
  }
  if ((data.get("payment_status") ?? "").trim() !== "COMPLETE") {
    return { ok: false, reason: "status" };
  }
  const amountGross = (data.get("amount_gross") ?? "").trim();
  const moments = momentsForAmount(amountGross);
  if (moments <= 0) return { ok: false, reason: "amount" };
  const email = orderEmail(data);
  if (typeof email !== "string") return { ok: false, reason: email.reason };
  const pfPaymentId = (data.get("pf_payment_id") ?? "").trim();
  if (!/^[A-Za-z0-9_-]{1,80}$/.test(pfPaymentId)) return { ok: false, reason: "payment" };
  return { ok: true, email, pfPaymentId, amountGross, moments };
}

/**
 * Credit the checkout email we stored in custom_str2 when Payfast echoes it
 * and custom_str1 is still emailVaultId of that address. A blank custom_str2
 * (checkout from before that field) falls back to email_address under the
 * same vault check. Payfast's email_address is not trusted on its own: it
 * can be the payer's Payfast account, not the address typed at checkout.
 */
function orderEmail(data: Map<string, string>): string | { reason: "email" | "buyer" } {
  const vault = (data.get("custom_str1") ?? "").trim();
  const carried = normalizeEmail(data.get("custom_str2") ?? "");
  const posted = normalizeEmail(data.get("email_address") ?? "");
  const email = carried || posted;
  if (!isValidEmail(email)) return { reason: "email" };
  if (vault !== emailVaultId(email)) return { reason: "buyer" };
  return email;
}

export async function payfastConfirms(
  rawBody: string,
  fetchImpl: typeof fetch = fetch,
): Promise<boolean> {
  const response = await fetchImpl(payfastValidateUrl(), {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": "GoodDayNight-ITN",
    },
    body: rawBody,
    cache: "no-store",
    signal: AbortSignal.timeout(12_000),
  });
  const text = (await response.text()).replace(/^\uFEFF/, "").trimStart();
  return response.ok && text.startsWith("VALID");
}

function rejectItn(reason: string): { status: 500; body: "NOT OK" } {
  console.warn("[payfast-itn] rejected", reason);
  return { status: 500, body: "NOT OK" };
}

/** 500 until the credit is stored, then 200. Payfast retries any non-200. */
export async function handlePayfastItn(
  rawBody: string,
  fetchImpl: typeof fetch = fetch,
): Promise<{ status: number; body: string }> {
  const merchant = payfastMerchant();
  if (!merchant) return rejectItn("unconfigured");
  const decision = decideItn(rawBody, merchant.passphrase, merchant.merchantId);
  const buyerBlocked = !decision.ok && (decision.reason === "buyer" || decision.reason === "email");
  if (!decision.ok && !buyerBlocked) return rejectItn(decision.reason);
  let confirmed = false;
  try {
    confirmed = await payfastConfirms(rawBody, fetchImpl);
  } catch {
    return rejectItn("validate");
  }
  if (!confirmed) return rejectItn("validate");
  const pfPaymentId = decision.ok ? decision.pfPaymentId : postedPaymentId(rawBody);
  if (!pfPaymentId) return rejectItn(decision.ok ? "payment" : decision.reason);
  let recorded: { remaining: number } | null = null;
  try {
    recorded = await recordedPayment(pfPaymentId);
  } catch {
    return rejectItn("credit");
  }
  if (recorded) {
    console.info("[payfast-itn] credited", {
      pf_payment_id: pfPaymentId,
      remaining: recorded.remaining,
      duplicate: true,
    });
    return { status: 200, body: "OK" };
  }
  if (!decision.ok) return rejectItn(decision.reason);
  let credited: { remaining: number; duplicate: boolean };
  try {
    credited = await creditMoments({
      email: decision.email,
      pfPaymentId: decision.pfPaymentId,
      amountGross: decision.amountGross,
      moments: decision.moments,
    });
  } catch {
    return rejectItn("credit");
  }
  console.info("[payfast-itn] credited", {
    pf_payment_id: decision.pfPaymentId,
    remaining: credited.remaining,
    duplicate: credited.duplicate,
  });
  return { status: 200, body: "OK" };
}

function postedPaymentId(rawBody: string): string {
  const id = parseFormPairs(rawBody).find(([key]) => key === "pf_payment_id")?.[1]?.trim() ?? "";
  return /^[A-Za-z0-9_-]{1,80}$/.test(id) ? id : "";
}
