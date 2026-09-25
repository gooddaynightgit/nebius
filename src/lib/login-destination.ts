/** Email-only screen. No price, and no payment button. */
export const SIGN_IN_HREF = "/signin";

/** Photo page when `goodfans.game` is above zero. */
export const CAPTURE_HREF = "/app";

/** Buy page when the verified email has no moments left. */
export const PAYMENT_HREF = "/moments";

/**
 * Where a verified email goes after the server has read `goodfans.game`.
 * Above zero captures. Zero, negative, or a missing row pays.
 * A failed lookup is not a number — callers pass null and land on payment.
 */
export function destinationAfterVerifiedLogin(game: number | null): typeof CAPTURE_HREF | typeof PAYMENT_HREF {
  return typeof game === "number" && Number.isFinite(game) && game > 0 ? CAPTURE_HREF : PAYMENT_HREF;
}

/**
 * Follow the path the server already chose. Anything other than capture
 * is payment, so a missing or unexpected `next` cannot loop back to sign-in.
 */
export function followVerifiedLogin(next: unknown): typeof CAPTURE_HREF | typeof PAYMENT_HREF {
  return next === CAPTURE_HREF ? CAPTURE_HREF : PAYMENT_HREF;
}
