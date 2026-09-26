import { dayFromUnixMsWithOffset, isValidDayStamp, isValidTzOffset, localDay } from "./day";

/** Shown on the result-screen Share button. The moment lasts through this local minute. */
export const SAVED_MOMENT_EXPIRES_NOTE = "disappears tonight 23:59";

export function shareMomentButtonLabel(action: string): string {
  return `${action} · ${SAVED_MOMENT_EXPIRES_NOTE}`;
}

/** Milliseconds until the next local midnight. At 23:59:00 this is 60s; at 00:00:00 it is 24h. */
export function msUntilLocalMidnight(now = new Date()): number {
  const next = new Date(now);
  next.setHours(24, 0, 0, 0);
  return Math.max(0, next.getTime() - now.getTime());
}

export function readTzOffset(value: string | null | undefined): number | null {
  if (value == null || value.trim() === "") return null;
  const tz = Number(value);
  return isValidTzOffset(tz) ? tz : null;
}

/**
 * The viewer's calendar day. `tzOffsetMinutes` matches `Date#getTimezoneOffset`.
 * A missing offset falls back to the day the client already computed locally.
 */
export function localTodayForClient(input: {
  day?: string | null;
  tzOffset?: number | null;
  now?: Date;
}): string {
  const now = input.now ?? new Date();
  if (typeof input.tzOffset === "number" && isValidTzOffset(input.tzOffset)) {
    return dayFromUnixMsWithOffset(now.getTime(), input.tzOffset);
  }
  if (input.day && isValidDayStamp(input.day)) return input.day;
  return localDay(now);
}

/**
 * A saved moment stays through 23:59 of its local calendar day and is gone at 00:00.
 * `savedDay` and `today` are `YYYY-MM-DD` in the viewer's time zone.
 */
export function isSavedMomentExpired(savedDay: string, today: string): boolean {
  if (!isValidDayStamp(savedDay) || !isValidDayStamp(today)) return false;
  return savedDay < today;
}

export function keptSavedMoments<T extends { day: string }>(items: readonly T[], today: string): T[] {
  return items.filter((item) => !isSavedMomentExpired(item.day, today));
}
