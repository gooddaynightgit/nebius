import { openBuyerHandoff } from "./buyer-handoff";
import { purchaseFromStored, type VerifiedPurchase } from "./google-ads";
import { isValidEmail, normalizeEmail } from "./identity";
import { otpSessionSecret } from "./otp-session";
import { getJSON, putJSON } from "./storage";

export {
  PAID_APP_HREF,
  PAID_APP_LABEL,
  PAID_CONFIRMING_LABEL,
  PAID_POLL_MS,
  PAID_SETTLING_HEADING,
  PAID_SETTLING_LINE,
  PAID_SUCCESS_HEADING,
  PAID_SUCCESS_LINE,
  PAID_WAIT_MS,
} from "./paid-copy";

const ORDER_RE = /^[A-Za-z0-9_-]{1,80}$/;

export type PayfastOrderStatus = "pending" | "complete" | "cancelled";

export type PaidView = "complete" | "pending" | "absent";

type StoredOrder = {
  email: string;
  mPaymentId: string;
  status: PayfastOrderStatus;
  pfPaymentId?: string;
  /** Verified ITN `amount_gross`, major units (Payfast rands, not cents). */
  amount?: string;
  /** Uppercase ISO currency recorded with the verified ITN. */
  currency?: string;
  updatedAt: string;
};

export function isPayfastOrderRef(value: string): boolean {
  return ORDER_RE.test(value);
}

function orderKey(mPaymentId: string): string {
  return `payfast/orders/${mPaymentId}.json`;
}

async function readOrder(mPaymentId: string): Promise<StoredOrder | null> {
  if (!isPayfastOrderRef(mPaymentId)) return null;
  const saved = await getJSON<StoredOrder>(orderKey(mPaymentId));
  if (!saved || typeof saved !== "object") return null;
  if (saved.email !== normalizeEmail(saved.email ?? "") || !isValidEmail(saved.email)) return null;
  if (saved.mPaymentId !== mPaymentId) return null;
  if (saved.status !== "pending" && saved.status !== "complete" && saved.status !== "cancelled") return null;
  return saved;
}

/** Checkout started. The return page can wait for the ITN without trusting the query string. */
export async function rememberPayfastOrder(email: string, mPaymentId: string): Promise<void> {
  const normalized = normalizeEmail(email);
  if (!isValidEmail(normalized) || !isPayfastOrderRef(mPaymentId)) {
    throw new Error("Payfast order could not be remembered.");
  }
  const existing = await readOrder(mPaymentId);
  if (existing && existing.email !== normalized) {
    throw new Error("Payfast order could not be remembered.");
  }
  if (existing?.status === "complete" || existing?.status === "cancelled") return;
  const row: StoredOrder = {
    email: normalized,
    mPaymentId,
    status: "pending",
    updatedAt: new Date().toISOString(),
  };
  await putJSON(orderKey(mPaymentId), row);
}

/** A verified COMPLETE ITN. A later cancel must not undo this. */
export async function completePayfastOrder(
  email: string,
  mPaymentId: string,
  pfPaymentId: string,
  paid?: { amount: string; currency: string },
): Promise<void> {
  const normalized = normalizeEmail(email);
  if (!isValidEmail(normalized) || !isPayfastOrderRef(mPaymentId) || !isPayfastOrderRef(pfPaymentId)) return;
  const existing = await readOrder(mPaymentId);
  if (existing && existing.email !== normalized) return;
  const verified = paid
    ? purchaseFromStored({ pfPaymentId, amount: paid.amount, currency: paid.currency })
    : null;
  const row: StoredOrder = {
    email: normalized,
    mPaymentId,
    status: "complete",
    pfPaymentId,
    updatedAt: new Date().toISOString(),
  };
  if (verified && paid) {
    row.amount = paid.amount.trim();
    row.currency = verified.currency;
  }
  await putJSON(orderKey(mPaymentId), row);
}

/** A signed ITN whose payment_status is CANCELLED. A completed order stays completed. */
export async function cancelPayfastOrder(mPaymentId: string): Promise<void> {
  if (!isPayfastOrderRef(mPaymentId)) return;
  const existing = await readOrder(mPaymentId);
  if (!existing || existing.status === "complete") return;
  const row: StoredOrder = {
    ...existing,
    status: "cancelled",
    updatedAt: new Date().toISOString(),
  };
  await putJSON(orderKey(mPaymentId), row);
}

/**
 * Success only when the signed handoff email matches the stored order.
 * The ref only chooses which order to read. A cookie session is not required.
 */
export async function paidViewForHandoff(
  mPaymentId: string | null,
  handoff: string | null,
  nowSec = Math.floor(Date.now() / 1000),
): Promise<PaidView> {
  if (!mPaymentId || !handoff || !isPayfastOrderRef(mPaymentId)) return "absent";
  const secret = otpSessionSecret();
  if (!secret) return "absent";
  const opened = openBuyerHandoff(handoff, nowSec, secret);
  if (!opened) return "absent";
  const order = await readOrder(mPaymentId);
  if (!order || order.email !== opened.email) return "absent";
  if (order.status === "complete") return "complete";
  if (order.status === "pending") return "pending";
  return "absent";
}

export type PaidPoll =
  | { status: "complete"; purchase: VerifiedPurchase | null }
  | { status: "pending" }
  | { status: "absent" };

/** Status for the return page poll. Purchase data only after the handoff matches. */
export async function paidPollForHandoff(
  mPaymentId: string | null,
  handoff: string | null,
  nowSec = Math.floor(Date.now() / 1000),
): Promise<PaidPoll> {
  const view = await paidViewForHandoff(mPaymentId, handoff, nowSec);
  if (view === "pending") return { status: "pending" };
  if (view !== "complete" || !mPaymentId) return { status: "absent" };
  const order = await readOrder(mPaymentId);
  if (!order || order.status !== "complete") return { status: "absent" };
  return {
    status: "complete",
    purchase: purchaseFromStored({
      pfPaymentId: order.pfPaymentId,
      amount: order.amount,
      currency: order.currency,
    }),
  };
}

export type PaidOutcome =
  | { kind: "success"; purchase: VerifiedPurchase | null }
  | { kind: "confirming"; ref: string; handoff: string }
  | { kind: "missing" };

export async function resolvePaidVisit(input: {
  ref: string | null;
  handoff: string | null;
  nowSec?: number;
}): Promise<PaidOutcome> {
  const view = await paidViewForHandoff(input.ref, input.handoff, input.nowSec);
  if (view === "complete" && input.ref) {
    const order = await readOrder(input.ref);
    const purchase = order
      ? purchaseFromStored({
          pfPaymentId: order.pfPaymentId,
          amount: order.amount,
          currency: order.currency,
        })
      : null;
    return { kind: "success", purchase };
  }
  if (view === "pending" && input.ref && input.handoff) {
    return { kind: "confirming", ref: input.ref, handoff: input.handoff };
  }
  return { kind: "missing" };
}
