import { buyerReturnUrl } from "./buyer-handoff";
import { creditMoments } from "./entitlement";
import { isValidEmail, normalizeEmail } from "./identity";
import { completePayfastOrder, isPayfastOrderRef } from "./paid-return";
import { ITEM_DESCRIPTION, ITEM_NAME, PACK_MOMENTS, publicOrigin } from "./payfast";
import { ensurePaymentVault } from "./vault";

/**
 * PayPal checkout (Orders v2, server side only).
 *
 * 1. POST /api/paypal/checkout creates an order for 7.99 USD with the buyer
 *    email in `custom_id` and our order ref in `invoice_id`, then redirects
 *    the buyer to PayPal to approve it.
 * 2. PayPal sends the buyer back to /api/paypal/return?ref=…&token=<order id>.
 *    We capture the order on the server, check it is COMPLETED for exactly
 *    7.99 USD with the same ref, then add 25 moments once per capture id.
 *
 * Return and cancel URLs use the origin the buyer is on, so a Preview
 * deployment returns to itself rather than to APP_URL.
 * The client secret never leaves the server. Live API unless PAYPAL_ENV=sandbox.
 */
export const PAYPAL_AMOUNT = "7.99";
export const PAYPAL_CURRENCY = "USD";

const ID_RE = /^[A-Za-z0-9_-]{1,80}$/;

export type PaypalCredentials = { clientId: string; secret: string };

export function paypalCredentials(): PaypalCredentials | null {
  const clientId = process.env.PAYPAL_CLIENT_ID?.trim() ?? "";
  const secret = process.env.PAYPAL_CLIENT_SECRET?.trim() ?? "";
  if (!clientId || !secret) return null;
  return { clientId, secret };
}

export function paypalSandbox(): boolean {
  return (process.env.PAYPAL_ENV ?? "").trim().toLowerCase() === "sandbox";
}

export function paypalApiBase(): string {
  return paypalSandbox() ? "https://api-m.sandbox.paypal.com" : "https://api-m.paypal.com";
}

async function accessToken(creds: PaypalCredentials, fetchImpl: typeof fetch): Promise<string> {
  const basic = Buffer.from(`${creds.clientId}:${creds.secret}`).toString("base64");
  const response = await fetchImpl(`${paypalApiBase()}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
    cache: "no-store",
    signal: AbortSignal.timeout(12_000),
  });
  const data = (await response.json().catch(() => null)) as { access_token?: unknown } | null;
  if (!response.ok || typeof data?.access_token !== "string") {
    console.error("[paypal] token refused", response.status);
    throw new Error("PayPal token refused.");
  }
  return data.access_token;
}

export function paypalOrderBody(email: string, ref: string, origin: string) {
  return {
    intent: "CAPTURE",
    purchase_units: [
      {
        reference_id: ref,
        invoice_id: ref,
        custom_id: email,
        description: ITEM_NAME,
        amount: { currency_code: PAYPAL_CURRENCY, value: PAYPAL_AMOUNT },
        items: [
          {
            name: ITEM_NAME,
            description: ITEM_DESCRIPTION.slice(0, 127),
            quantity: "1",
            category: "DIGITAL_GOODS",
            unit_amount: { currency_code: PAYPAL_CURRENCY, value: PAYPAL_AMOUNT },
          },
        ],
      },
    ],
    payment_source: {
      paypal: {
        experience_context: {
          brand_name: "GoodDayNight",
          shipping_preference: "NO_SHIPPING",
          user_action: "PAY_NOW",
          return_url: `${origin}/api/paypal/return?ref=${encodeURIComponent(ref)}`,
          cancel_url: `${origin}/moments?cancelled=1`,
        },
      },
    },
  };
}

type PaypalLink = { rel?: string; href?: string };

/** Creates the PayPal order and returns the URL where the buyer approves it. */
export async function createPaypalOrder(
  email: string,
  ref: string,
  origin: string = publicOrigin(),
  fetchImpl: typeof fetch = fetch,
): Promise<string> {
  const creds = paypalCredentials();
  if (!creds) throw new Error("PayPal is not configured.");
  const normalized = normalizeEmail(email);
  if (!isValidEmail(normalized) || !isPayfastOrderRef(ref)) throw new Error("Bad PayPal order.");
  const token = await accessToken(creds, fetchImpl);
  const response = await fetchImpl(`${paypalApiBase()}/v2/checkout/orders`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "PayPal-Request-Id": `create-${ref}`,
    },
    body: JSON.stringify(paypalOrderBody(normalized, ref, origin)),
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });
  const data = (await response.json().catch(() => null)) as { links?: PaypalLink[] } | null;
  const approve = data?.links?.find((link) => link.rel === "payer-action" || link.rel === "approve")?.href;
  if (!response.ok || !approve) {
    console.error("[paypal] create refused", response.status, JSON.stringify(data)?.slice(0, 500));
    throw new Error("PayPal order refused.");
  }
  return approve;
}

export type PaypalCapture =
  | { ok: true; email: string; captureId: string }
  | { ok: false; reason: string };

/** Pure check of a captured (or fetched) PayPal order. */
export function decidePaypalOrder(order: unknown, ref: string): PaypalCapture {
  const o = order as {
    status?: string;
    purchase_units?: Array<{
      invoice_id?: string;
      reference_id?: string;
      custom_id?: string;
      payments?: {
        captures?: Array<{
          id?: string;
          status?: string;
          invoice_id?: string;
          custom_id?: string;
          amount?: { currency_code?: string; value?: string };
        }>;
      };
    }>;
  } | null;
  if (!o || o.status !== "COMPLETED") return { ok: false, reason: "status" };
  const unit = o.purchase_units?.[0];
  if (!unit) return { ok: false, reason: "unit" };
  const capture = unit.payments?.captures?.find((c) => c.status === "COMPLETED");
  if (!capture) return { ok: false, reason: "capture" };
  const unitRef = unit.invoice_id ?? unit.reference_id ?? capture.invoice_id ?? "";
  if (unitRef !== ref) return { ok: false, reason: "ref" };
  if (capture.amount?.currency_code !== PAYPAL_CURRENCY || capture.amount?.value !== PAYPAL_AMOUNT) {
    return { ok: false, reason: "amount" };
  }
  const email = normalizeEmail(unit.custom_id ?? capture.custom_id ?? "");
  if (!isValidEmail(email)) return { ok: false, reason: "email" };
  const captureId = capture.id ?? "";
  if (!ID_RE.test(captureId)) return { ok: false, reason: "payment" };
  return { ok: true, email, captureId };
}

/** Captures the approved order. A second capture (page refresh) reads the order instead. */
export async function capturePaypalOrder(
  orderId: string,
  ref: string,
  fetchImpl: typeof fetch = fetch,
): Promise<PaypalCapture> {
  const creds = paypalCredentials();
  if (!creds) return { ok: false, reason: "unconfigured" };
  if (!ID_RE.test(orderId) || !isPayfastOrderRef(ref)) return { ok: false, reason: "input" };
  const token = await accessToken(creds, fetchImpl);
  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
  const captured = await fetchImpl(`${paypalApiBase()}/v2/checkout/orders/${orderId}/capture`, {
    method: "POST",
    headers: { ...headers, "PayPal-Request-Id": `capture-${orderId}` },
    cache: "no-store",
    signal: AbortSignal.timeout(20_000),
  });
  let order: unknown = await captured.json().catch(() => null);
  if (!captured.ok) {
    console.warn("[paypal] capture answered", captured.status);
    const fetched = await fetchImpl(`${paypalApiBase()}/v2/checkout/orders/${orderId}`, {
      headers,
      cache: "no-store",
      signal: AbortSignal.timeout(12_000),
    });
    order = fetched.ok ? await fetched.json().catch(() => null) : null;
  }
  return decidePaypalOrder(order, ref);
}

/**
 * Buyer came back from PayPal. Capture, credit once, and return the URL to
 * send them to: the /paid page on success, the buy page otherwise.
 */
export async function handlePaypalReturn(
  ref: string,
  orderId: string,
  origin: string = publicOrigin(),
  fetchImpl: typeof fetch = fetch,
): Promise<string> {
  const failed = `${origin}/moments?cancelled=1`;
  let result: PaypalCapture;
  try {
    result = await capturePaypalOrder(orderId, ref, fetchImpl);
  } catch (error) {
    console.error("[paypal] capture failed", error);
    return failed;
  }
  if (!result.ok) {
    console.warn("[paypal] rejected", result.reason);
    return failed;
  }
  try {
    const credited = await creditMoments({
      email: result.email,
      pfPaymentId: result.captureId,
      amountGross: PAYPAL_AMOUNT,
      moments: PACK_MOMENTS,
      source: "paypal",
    });
    console.info("[paypal] credited", {
      capture_id: result.captureId,
      remaining: credited.remaining,
      duplicate: credited.duplicate,
    });
  } catch (error) {
    // Money was taken; log loudly so the credit can be added by hand.
    console.error("[paypal] CREDIT FAILED after capture", result.captureId, result.email, error);
    return failed;
  }
  try {
    await completePayfastOrder(result.email, ref, result.captureId, {
      amount: PAYPAL_AMOUNT,
      currency: PAYPAL_CURRENCY,
    });
    await ensurePaymentVault(result.email);
  } catch (error) {
    console.error("[paypal] receipt stayed", error);
  }
  return buyerReturnUrl(origin, ref, result.email);
}
