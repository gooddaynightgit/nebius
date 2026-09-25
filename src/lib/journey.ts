/** Caption under a finished story, and the last dot on the bar. */
export const JOURNEY_FINISHED_CAPTION = "My good moment weaved";

export const JOURNEY_STEPS = [
  { label: "Weave your good moment" },
  { label: "Pick your joy" },
  { label: "Unlock your good moments" },
  { label: "Capture it" },
  { label: "What is the good in this moment?" },
  { label: "Weave my good moment" },
  { label: JOURNEY_FINISHED_CAPTION },
] as const;

export const JOURNEY_STEP_COUNT = JOURNEY_STEPS.length;

/** Same words as the bar, for the step buttons. */
export const STEP_LABEL = {
  start: JOURNEY_STEPS[0].label,
  joy: JOURNEY_STEPS[1].label,
  unlock: JOURNEY_STEPS[2].label,
  photo: JOURNEY_STEPS[3].label,
  good: JOURNEY_STEPS[4].label,
  turn: JOURNEY_STEPS[5].label,
} as const;

/** Where the photo page is within its steps, after Unlock. `weaved` is the finished story. */
export type AppProgress = "upload" | "good" | "turn" | "weaved";

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
 * good-in-this-moment question, then to Weave my good moment while the story is weaving.
 * The last dot stays empty until `/app/yours` is showing a woven story.
 * `/signin` is the same Unlock step: email only, before the price.
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
  if (path === "/moments" || path === "/signin") return 3;
  if (path === "/app/yours") {
    return appProgress === "weaved" ? JOURNEY_STEP_COUNT + 1 : 6;
  }
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
