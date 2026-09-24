export const JOURNEY_STEP_COUNT = 5;

export const JOURNEY_STEPS = [
  { label: "Turn your moment" },
  { label: "Pick your joy" },
  { label: "Unlock" },
  { label: "Upload your photo" },
  { label: "My good moment" },
] as const;

/** Same words as the bar, for the step buttons. */
export const STEP_LABEL = {
  start: JOURNEY_STEPS[0].label,
  joy: JOURNEY_STEPS[1].label,
  unlock: JOURNEY_STEPS[2].label,
  photo: JOURNEY_STEPS[3].label,
  story: JOURNEY_STEPS[4].label,
} as const;

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
 * (`paid=1`) which is already the photo step. Cancelled checkout stays on `/moments`.
 */
export function journeyStep(pathname: string, search: SearchParamsLike, gate: BuyerGate): number | null {
  const path = normalizeJourneyPath(pathname);
  if (path === "/") return 1;
  if (path === "/app/joy") return 2;
  if (path === "/moments") return 3;
  if (path === "/app/yours") return 5;
  if (path === "/app") {
    if (search.get("paid") === "1") return 4;
    if (gate === "open") return 4;
    return 3;
  }
  return null;
}

export function journeyFillPercent(step: number): number {
  if (step <= 1) return 0;
  const span = JOURNEY_STEP_COUNT - 1;
  return ((Math.min(step, JOURNEY_STEP_COUNT) - 1) / span) * 100;
}
