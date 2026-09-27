/** Same destination as the site home. A quiet link, not the weave button. */
export const PAID_APP_HREF = "/";

export const PAID_APP_LABEL = "Open GoodDayNight";

export const PAID_SUCCESS_HEADING = "You're in. 25 moments are yours.";

export const PAID_SUCCESS_LINE = "A quiet welcome, held for you.";

export const PAID_CONFIRMING_LABEL = "Confirming your payment\u2026";

export const PAID_SETTLING_HEADING = "Your payment is settling.";

export const PAID_SETTLING_LINE = "This page stays with you.";

export const PAID_POLL_MS = 2_000;

export const PAID_WAIT_MS = 30_000;

export function isPaidPath(pathname: string | null): boolean {
  if (!pathname) return false;
  const path = pathname.length > 1 && pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;
  return path === "/paid";
}
