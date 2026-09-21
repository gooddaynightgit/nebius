export const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

export function localDay(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA").format(now);
}

export function dayFromUnixMs(ms: number): string {
  return localDay(new Date(ms));
}

/** `tzOffsetMinutes` matches `Date#getTimezoneOffset` (minutes to add to local to get UTC). */
export function isValidTzOffset(value: number): boolean {
  return Number.isFinite(value) && Number.isInteger(value) && Math.abs(value) <= 14 * 60;
}

export function dayFromUnixMsWithOffset(ms: number, tzOffsetMinutes: number): string {
  if (!isValidTzOffset(tzOffsetMinutes)) return dayFromUnixMs(ms);
  return new Date(ms - tzOffsetMinutes * 60_000).toISOString().slice(0, 10);
}

export function isValidDayStamp(value: string): boolean {
  if (!DAY_RE.test(value)) return false;
  const [year, month, date] = value.split("-").map(Number);
  const utc = new Date(Date.UTC(year, month - 1, date));
  return (
    utc.getUTCFullYear() === year &&
    utc.getUTCMonth() === month - 1 &&
    utc.getUTCDate() === date
  );
}

/** Client local day is accepted if it is within one UTC day of now. */
export function isPlausibleClientDay(day: string, now = new Date()): boolean {
  if (!isValidDayStamp(day)) return false;
  const utcToday = now.toISOString().slice(0, 10);
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  return day === utcToday || day === yesterday || day === tomorrow;
}

export function exifDateToDay(value: string): string | null {
  const match = value.trim().match(/^(\d{4}):(\d{2}):(\d{2})/);
  if (!match) return null;
  const day = `${match[1]}-${match[2]}-${match[3]}`;
  return isValidDayStamp(day) ? day : null;
}
