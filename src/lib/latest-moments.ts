/** How many of a person's own saved moments a list may show. */
export const LATEST_MOMENTS_LIMIT = 8;

type DatedMoment = {
  id: string;
  createdAt: string;
};

type LatestMomentsOptions = {
  /** Story already shown on its own. It stays on screen and does not use a list slot. */
  excludeId?: string | null;
  limit?: number;
};

/**
 * Display cap for a person's saved moments.
 * Storage is left untouched: this sorts a copy and returns at most `limit` rows.
 */
export function latestMoments<T extends DatedMoment>(
  items: readonly T[],
  options: LatestMomentsOptions = {},
): T[] {
  const limit = options.limit ?? LATEST_MOMENTS_LIMIT;
  const excludeId = options.excludeId ?? null;
  const seen = new Set<string>();
  const unique: T[] = [];
  for (const item of items) {
    if (!item?.id) continue;
    if (excludeId && item.id === excludeId) continue;
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    unique.push(item);
  }
  unique.sort((a, b) => {
    const byTime = b.createdAt.localeCompare(a.createdAt);
    if (byTime !== 0) return byTime;
    return b.id.localeCompare(a.id);
  });
  if (limit <= 0) return [];
  return unique.slice(0, limit);
}

/**
 * Day and clock in the viewer's time zone.
 * `createdAt` is a UTC instant. Slicing its `HH:mm` next to a local `day`
 * showed future times (23:19 UTC on the previous date labeled as today).
 */
export function momentListLabel(
  item: { day?: string; createdAt: string },
  timeZone?: string,
): string {
  const created = item.createdAt.trim();
  const ms = Date.parse(created);
  if (!Number.isNaN(ms) && /T\d{2}:\d{2}/.test(created)) {
    const clock = zonedClock(new Date(ms), timeZone);
    if (clock) return `${clock.day} · ${clock.time}`;
  }
  return item.day || created.slice(0, 10);
}

function zonedClock(date: Date, timeZone?: string): { day: string; time: string } | null {
  try {
    const fmt = new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    });
    const parts = Object.fromEntries(fmt.formatToParts(date).map((part) => [part.type, part.value]));
    if (!parts.year || !parts.month || !parts.day || !parts.hour || !parts.minute) return null;
    const hour = parts.hour === "24" ? "00" : parts.hour.padStart(2, "0");
    return {
      day: `${parts.year}-${parts.month}-${parts.day}`,
      time: `${hour}:${parts.minute.padStart(2, "0")}`,
    };
  } catch {
    return null;
  }
}
