/** Photo page. A visitor with no verified session is sent to the email screen first. */
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
 * Signed out opens the email screen (`/moments`), not a form on the photo page.
 * Signed in follows `game`. A failed balance check stays on the photo page.
 */
export function uploadPhotoDestination(
  signedIn: boolean,
  game: number | null,
): typeof CAPTURE_PHOTO_HREF | typeof BUY_MOMENTS_HREF {
  if (!signedIn) return BUY_MOMENTS_HREF;
  if (game === null) return CAPTURE_PHOTO_HREF;
  return destinationForGame(game);
}

/**
 * Take and upload stay available on every return while credit remains.
 * How many moments were already saved does not close them.
 */
export function photoButtonsEnabled(signedIn: boolean, game: number | null): boolean {
  return signedIn && typeof game === "number" && game > 0;
}

/**
 * A cached photo page can reappear still "turning" the previous story.
 * Drop that flag. A visit that was busy had already finished the weave,
 * so the next photo is a new moment.
 */
export function releaseCaptureVisit(wasBusy: boolean): { busy: false; startNewMoment: boolean } {
  return { busy: false, startNewMoment: wasBusy };
}

/** After a balance check on the photo page: stay to capture, leave for the buy page, or stay on an error. */
export function destinationForEntitlement(
  result: EntitlementGate,
): typeof CAPTURE_PHOTO_HREF | typeof BUY_MOMENTS_HREF | null {
  if (result === "open") return CAPTURE_PHOTO_HREF;
  if (result === "error") return null;
  return BUY_MOMENTS_HREF;
}
