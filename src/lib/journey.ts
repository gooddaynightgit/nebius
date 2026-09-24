export const JOURNEY_STEP_COUNT = 6;

export const JOURNEY_STEPS = [
  { label: "Turn your moment" },
  { label: "Pick your joy" },
  { label: "Unlock" },
  { label: "Capture it" },
  { label: "What is the good in this moment?" },
  { label: "Turn my moment" },
] as const;

/** Caption under a finished story. Not a seventh dot. */
export const JOURNEY_FINISHED_CAPTION = "My good moment weaved";

/** Same words as the bar, for the step buttons. */
export const STEP_LABEL = {
  start: JOURNEY_STEPS[0].label,
  joy: JOURNEY_STEPS[1].label,
  unlock: JOURNEY_STEPS[2].label,
  photo: JOURNEY_STEPS[3].label,
  good: JOURNEY_STEPS[4].label,
  turn: JOURNEY_STEPS[5].label,
} as const;

/** Where the photo page is within its three steps, after Unlock. */
export type AppProgress = "upload" | "good" | "turn";

export type BuyerGate = "unknown" | "locked" | "open";

type SearchParamsLike = { get(name: string): string | null };

export function normalizeJourneyPath(pathname: string): string {
  if (!pathname) return "/";
  if (pathname.length > 1 && pathname.endsWith("/")) return pathname.slice(0, -1);
  return pathname;
}

/**
 * 1-based step for the shared progress bar, or null when the route is not part of the flow.
 * On `/app`, Unlock stays current until the buyer gate is open, except a PayFast return
 * (`paid=1`) which is already the photo step. After that, the photo page moves to the
 * good-in-this-moment question, then to Turn my moment while the story is weaving.
 * Cancelled checkout stays on `/moments`.
 */
export function journeyStep(
  pathname: string,
  search: SearchParamsLike,
  gate: BuyerGate,
  appProgress: AppProgress = "upload",
): number | null {
  const path = normalizeJourneyPath(pathname);
  if (path === "/") return 1;
  if (path === "/app/joy") return 2;
  if (path === "/moments") return 3;
  if (path === "/app/yours") return JOURNEY_STEP_COUNT + 1;
  if (path === "/app") {
    const onPhoto = search.get("paid") === "1" || gate === "open";
    if (!onPhoto) return 3;
    if (appProgress === "turn") return 6;
    if (appProgress === "good") return 5;
    return 4;
  }
  return null;
}

export function journeyFillPercent(step: number): number {
  if (step <= 1) return 0;
  const span = JOURNEY_STEP_COUNT - 1;
  return ((Math.min(step, JOURNEY_STEP_COUNT) - 1) / span) * 100;
}
