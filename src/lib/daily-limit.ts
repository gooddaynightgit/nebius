import type { CaptureRecord } from "./types";

/** Good moments one person can save per day. */
export const DAILY_MOMENT_LIMIT = 3;

/** Shown when today's three are saved. Warm, present tense, no "limit" wording. */
export const DAILY_MOMENT_LIMIT_NOTE = "That's your three good moments for today. Tomorrow is new.";

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Moments saved in the last 24 hours. Yesterday's moments are already purged at local
 * midnight, so this resets each day, and it cannot be dodged by sending a different `day`.
 */
export function momentsSavedToday(
  captures: readonly Pick<CaptureRecord, "id" | "createdAt">[],
  now = new Date(),
): number {
  const since = now.getTime() - DAY_MS;
  return captures.filter((capture) => {
    const at = Date.parse(capture.createdAt);
    return Number.isFinite(at) && at > since;
  }).length;
}

/** True when a brand-new moment would go past today's three. Editing an existing one is fine. */
export function isDailyMomentLimitReached(
  captures: readonly Pick<CaptureRecord, "id" | "createdAt">[],
  options: { replacingId?: string | null; now?: Date } = {},
): boolean {
  if (options.replacingId && captures.some((capture) => capture.id === options.replacingId)) {
    return false;
  }
  return momentsSavedToday(captures, options.now) >= DAILY_MOMENT_LIMIT;
}
