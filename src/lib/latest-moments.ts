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

/** Day plus UTC time, so a list shows newest-first order even when two stories share a day. */
export function momentListLabel(item: { day?: string; createdAt: string }): string {
  const created = item.createdAt.trim();
  const day = item.day || created.slice(0, 10);
  const time = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(created) ? created.slice(11, 16) : "";
  return time ? `${day} · ${time}` : day;
}
