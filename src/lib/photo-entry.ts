/** Photo page. Unsigned buyers see the existing email and OTP form here. */
export const CAPTURE_PHOTO_HREF = "/app";

/** Buy page when `goodfans.game` is not above zero. */
export const BUY_MOMENTS_HREF = "/moments";

export type EntitlementGate = "open" | "closed" | "exhausted" | "error";

/**
 * Where a signed-in buyer goes.
 * `game` is the remaining-moments attribute on DynamoDB `goodfans`
 * (the entitlement API returns it as `remaining`).
 * Above zero opens the capture page. Zero, missing, or negative opens the buy page.
 */
export function destinationForGame(game: number): typeof CAPTURE_PHOTO_HREF | typeof BUY_MOMENTS_HREF {
  return game > 0 ? CAPTURE_PHOTO_HREF : BUY_MOMENTS_HREF;
}

/**
 * Upload your photo.
 * Signed out opens the existing email + OTP form.
 * Signed in follows `game` (null means the balance check failed, so stay on that form).
 */
export function uploadPhotoDestination(
  signedIn: boolean,
  game: number | null,
): typeof CAPTURE_PHOTO_HREF | typeof BUY_MOMENTS_HREF {
  if (!signedIn || game === null) return CAPTURE_PHOTO_HREF;
  return destinationForGame(game);
}

/** After OTP on the photo page: open capture, leave for the buy page, or stay on an error. */
export function destinationForEntitlement(
  result: EntitlementGate,
): typeof CAPTURE_PHOTO_HREF | typeof BUY_MOMENTS_HREF | null {
  if (result === "open") return CAPTURE_PHOTO_HREF;
  if (result === "error") return null;
  return BUY_MOMENTS_HREF;
}
