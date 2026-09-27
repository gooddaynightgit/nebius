import { isValidEmail, normalizeEmail } from "./identity";
import { PAID_UNLOCK_HREF } from "./paid-copy";
import { getJSON, putJSON } from "./storage";

export {
  PAID_CONFIRMING_LABEL,
  PAID_POLL_MS,
  PAID_SUCCESS_HEADING,
  PAID_UNLOCK_HREF,
  PAID_WAIT_MS,
  PAID_WEAVE_HREF,
} from "./paid-copy";

const ORDER_RE = /^[A-Za-z0-9_-]{1,80}$/;

export type PayfastOrderStatus = "pending" | "complete" | "cancelled";

export type PaidView = "complete" | "pending" | "absent";

type StoredOrder = {
  email: string;
  mPaymentId: string;
  status: PayfastOrderStatus;
  pfPaymentId?: string;
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
): Promise<void> {
  const normalized = normalizeEmail(email);
  if (!isValidEmail(normalized) || !isPayfastOrderRef(mPaymentId) || !isPayfastOrderRef(pfPaymentId)) return;
  const existing = await readOrder(mPaymentId);
  if (existing && existing.email !== normalized) return;
  const row: StoredOrder = {
    email: normalized,
    mPaymentId,
    status: "complete",
    pfPaymentId,
    updatedAt: new Date().toISOString(),
  };
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
 * Success only when this buyer's stored order was marked complete by the ITN.
 * The ref query param only chooses which stored order to read.
 */
export async function paidViewForBuyer(email: string | null, mPaymentId: string | null): Promise<PaidView> {
  if (!email || !mPaymentId) return "absent";
  const normalized = normalizeEmail(email);
  if (!isValidEmail(normalized) || !isPayfastOrderRef(mPaymentId)) return "absent";
  const order = await readOrder(mPaymentId);
  if (!order || order.email !== normalized) return "absent";
  if (order.status === "complete") return "complete";
  if (order.status === "pending") return "pending";
  return "absent";
}

export type PaidOutcome =
  | { kind: "success" }
  | { kind: "confirming"; ref: string }
  | { kind: "redirect"; href: typeof PAID_UNLOCK_HREF };

export async function resolvePaidVisit(input: {
  email: string | null;
  ref: string | null;
}): Promise<PaidOutcome> {
  const view = await paidViewForBuyer(input.email, input.ref);
  if (view === "complete") return { kind: "success" };
  if (view === "pending" && input.ref) return { kind: "confirming", ref: input.ref };
  return { kind: "redirect", href: PAID_UNLOCK_HREF };
}
