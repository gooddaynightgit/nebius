/** Destination of the former joy-page link "See your Created story →" (`href="/app/yours"`). */
export const SAVED_JOY_MOMENTS_HREF = "/app/yours";

export const SAVED_JOY_MOMENTS_ID = "saved-joy-moments";

export const SAVED_JOY_MOMENTS_LABEL = "Your saved joy moments";

/** This choice only navigates. It is not a catalog joy and must not be stored or woven. */
export function isSavedJoyMomentsId(id: string | null | undefined): boolean {
  return id === SAVED_JOY_MOMENTS_ID;
}

/**
 * Persist a catalog joy for story creation.
 * Saved joy moments are refused so they never become a chosen joy (no charge, no weave).
 */
export function chooseStoryJoy(joyId: string, write: (joyId: string) => void): boolean {
  if (isSavedJoyMomentsId(joyId)) return false;
  write(joyId);
  return true;
}

/** Open the same page the removed "See your Created story →" link pointed to. */
export function openSavedJoyMoments(assign: (href: string) => void): void {
  assign(SAVED_JOY_MOMENTS_HREF);
}
