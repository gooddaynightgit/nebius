import { emailVaultId, normalizeEmail } from "./identity";
import { getJSON, putJSON } from "./storage";

export type Entitlement = {
  emailVaultId: string;
  remaining: number;
  paymentIds: string[];
  updatedAt: string;
};

export type PaymentRecord = {
  pfPaymentId: string;
  emailVaultId: string;
  amountGross: string;
  moments: number;
  createdAt: string;
};

function entitlementKey(email: string): string {
  return `entitlements/${emailVaultId(email)}.json`;
}

function paymentKey(pfPaymentId: string): string {
  return `payments/${pfPaymentId}.json`;
}

export async function getEntitlement(email: string): Promise<Entitlement | null> {
  const normalized = normalizeEmail(email);
  return getJSON<Entitlement>(entitlementKey(normalized));
}

/**
 * Credit a confirmed Payfast payment once. The payment id is the idempotency
 * key: a repeat ITN does not add another pack.
 */
export async function creditMoments(input: {
  email: string;
  pfPaymentId: string;
  amountGross: string;
  moments: number;
}): Promise<{ remaining: number; duplicate: boolean }> {
  if (!Number.isInteger(input.moments) || input.moments < 1) {
    throw new Error("Refusing to credit an empty pack.");
  }
  if (!/^[A-Za-z0-9_-]{1,80}$/.test(input.pfPaymentId)) {
    throw new Error("Invalid Payfast payment id.");
  }
  const email = normalizeEmail(input.email);
  const prior = await getJSON<PaymentRecord>(paymentKey(input.pfPaymentId));
  const current = (await getEntitlement(email)) ?? {
    emailVaultId: emailVaultId(email),
    remaining: 0,
    paymentIds: [],
    updatedAt: new Date().toISOString(),
  };
  const already = Boolean(prior) || current.paymentIds.includes(input.pfPaymentId);
  if (already && current.paymentIds.includes(input.pfPaymentId)) {
    return { remaining: current.remaining, duplicate: true };
  }
  const updatedAt = new Date().toISOString();
  const next: Entitlement = already
    ? current
    : {
        ...current,
        remaining: current.remaining + input.moments,
        paymentIds: [...current.paymentIds, input.pfPaymentId],
        updatedAt,
      };
  if (!already) await putJSON(entitlementKey(email), next);
  if (!prior) {
    const record: PaymentRecord = {
      pfPaymentId: input.pfPaymentId,
      emailVaultId: next.emailVaultId,
      amountGross: input.amountGross,
      moments: input.moments,
      createdAt: updatedAt,
    };
    await putJSON(paymentKey(input.pfPaymentId), record);
  }
  return { remaining: next.remaining, duplicate: already };
}

/** Spend one moment save (a new day's photo → My good moment). Replay, Share, joy picks, and same-day replaces do not call this. */
export async function consumeMoment(email: string): Promise<number | null> {
  const current = await getEntitlement(email);
  if (!current || current.remaining < 1) return null;
  const next: Entitlement = {
    ...current,
    remaining: current.remaining - 1,
    updatedAt: new Date().toISOString(),
  };
  await putJSON(entitlementKey(email), next);
  return next.remaining;
}
