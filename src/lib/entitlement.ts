import { emailVaultId, normalizeEmail } from "./identity";
import { activeFansTable } from "./fans";

export type Entitlement = {
  emailVaultId: string;
  remaining: number;
  paymentIds: string[];
  updatedAt: string;
};

/**
 * Remaining moment saves are the `game` attribute on DynamoDB `goodfans`.
 * The partition key `order` is the normalized buyer email. A confirmed pack
 * adds 40 (the same credit as before). A repeat Payfast payment id does not
 * add again. Blob/S3 entitlement JSON is not used.
 */
export async function getEntitlement(email: string): Promise<Entitlement | null> {
  const normalized = normalizeEmail(email);
  const row = await activeFansTable().get(normalized);
  if (!row) return null;
  return {
    emailVaultId: row.emailVaultId || emailVaultId(normalized),
    remaining: row.game,
    paymentIds: row.paymentIds,
    updatedAt: row.updatedAt,
  };
}

/**
 * Credit a confirmed Payfast payment once. The payment id is the idempotency
 * key: a repeat ITN does not add another pack. A new payment id adds `moments`
 * onto the same email row (a second pack stacks on whatever `game` is left).
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
  const result = await activeFansTable().credit({
    order: email,
    pfPaymentId: input.pfPaymentId,
    amountGross: input.amountGross,
    moments: input.moments,
    emailVaultId: emailVaultId(email),
    source: "payfast",
    now: new Date().toISOString(),
  });
  return { remaining: result.game, duplicate: result.duplicate };
}

/** A Payfast id already stored on some `goodfans` row, including a hand credit. */
export async function recordedPayment(
  pfPaymentId: string,
): Promise<{ remaining: number } | null> {
  const row = await activeFansTable().findPayment(pfPaymentId);
  if (!row?.paymentIds.includes(pfPaymentId)) return null;
  return { remaining: row.game };
}

/**
 * Spend one moment save (a new day's photo → My good moment).
 * Replay, Share, joy picks, and same-day replaces do not call this.
 * Returns the new balance, or null when `game` is already 0 or the row is missing.
 */
export async function consumeMoment(email: string): Promise<number | null> {
  const normalized = normalizeEmail(email);
  if (!normalized) return null;
  return activeFansTable().consume(normalized, new Date().toISOString());
}

/** Give back one moment when the photo save fails after consumeMoment. */
export async function restoreMoment(email: string): Promise<void> {
  const normalized = normalizeEmail(email);
  if (!normalized) return;
  await activeFansTable().restore(normalized, new Date().toISOString());
}
