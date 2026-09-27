import { dayFromUnixMsWithOffset } from "./day";
import { getJSON, listKeys, putJSON } from "./storage";
import type { VaultRecord } from "./types";
import { purgeExpiredSavedMoments } from "./vault";

/**
 * Minutes east of UTC, in `Date#getTimezoneOffset` form.
 * UTC−12 is the last zone to reach midnight, so its calendar date is the earliest "today" anywhere.
 */
export const EARLIEST_ZONE_OFFSET_MINUTES = 12 * 60;

/** 12:15 UTC, which is 14:15 SAST (UTC+2). Just after midnight in UTC−12. */
export const MOMENT_SWEEP_CRON = "15 12 * * *";

const PROGRESS_KEY = "index/moment-sweep.json";
const DEFAULT_BUDGET_MS = 45_000;
const DEFAULT_PAGE_SIZE = 200;

type SweepProgress = {
  /** List cursor that produced the page still in progress. Absent on the first page. */
  pageCursor?: string;
  /** Last key fully handled on that page. */
  afterKey?: string;
};

export type MomentSweepResult = {
  cutoffDay: string;
  vaultsSeen: number;
  vaultsPurged: number;
  failures: number;
  done: boolean;
};

export function earliestCurrentLocalDay(now = new Date()): string {
  return dayFromUnixMsWithOffset(now.getTime(), EARLIEST_ZONE_OFFSET_MINUTES);
}

function vaultIdFromKey(key: string): string | null {
  const match = /^vaults\/([^/]+)\/vault\.json$/.exec(key);
  return match?.[1] ?? null;
}

function isVault(value: unknown, id: string): value is VaultRecord {
  if (!value || typeof value !== "object") return false;
  const vault = value as VaultRecord;
  return vault.id === id && Array.isArray(vault.stories) && Array.isArray(vault.captures);
}

async function loadProgress(): Promise<SweepProgress> {
  try {
    const saved = await getJSON<SweepProgress>(PROGRESS_KEY);
    if (!saved || typeof saved !== "object") return {};
    return {
      pageCursor: typeof saved.pageCursor === "string" ? saved.pageCursor : undefined,
      afterKey: typeof saved.afterKey === "string" ? saved.afterKey : undefined,
    };
  } catch (error) {
    console.error("[moment-sweep] progress unreadable", error);
    return {};
  }
}

async function saveProgress(progress: SweepProgress): Promise<void> {
  try {
    await putJSON(PROGRESS_KEY, progress);
  } catch (error) {
    console.error("[moment-sweep] progress stayed", error);
  }
}

/**
 * Delete saved moments that are already over in every time zone.
 * The cutoff is the calendar date in UTC−12, so a moment that is still "today" for its owner stays.
 * Listing is paged. A run that runs out of time saves its place and continues on the next run.
 */
export async function sweepExpiredMoments(options?: {
  now?: Date;
  budgetMs?: number;
  pageSize?: number;
  maxVaults?: number;
}): Promise<MomentSweepResult> {
  const now = options?.now ?? new Date();
  const cutoffDay = earliestCurrentLocalDay(now);
  const budgetMs = options?.budgetMs ?? DEFAULT_BUDGET_MS;
  const pageSize = Math.min(Math.max(options?.pageSize ?? DEFAULT_PAGE_SIZE, 1), 1000);
  const maxVaults = options?.maxVaults ?? Number.POSITIVE_INFINITY;
  const deadline = Date.now() + budgetMs;

  let progress = await loadProgress();
  const startedMidway = Boolean(progress.pageCursor || progress.afterKey);
  let didWrap = false;
  let vaultsSeen = 0;
  let vaultsPurged = 0;
  let failures = 0;

  const result = (done: boolean): MomentSweepResult => ({
    cutoffDay,
    vaultsSeen,
    vaultsPurged,
    failures,
    done,
  });

  while (Date.now() < deadline && vaultsSeen < maxVaults) {
    let page;
    try {
      page = await listKeys({ prefix: "vaults/", cursor: progress.pageCursor, limit: pageSize });
    } catch (error) {
      failures += 1;
      console.error("[moment-sweep] list failed", error);
      await saveProgress(progress);
      return result(false);
    }

    const resumeAt = progress.afterKey
      ? page.keys.findIndex((key) => key === progress.afterKey) + 1
      : 0;
    const keys = resumeAt > 0 ? page.keys.slice(resumeAt) : page.keys;
    let lastDone = progress.afterKey;

    for (const key of keys) {
      if (Date.now() >= deadline || vaultsSeen >= maxVaults) {
        progress = { pageCursor: progress.pageCursor, afterKey: lastDone };
        await saveProgress(progress);
        return result(false);
      }
      if (key.endsWith("/vault.json")) {
        vaultsSeen += 1;
        const id = vaultIdFromKey(key);
        try {
          const loaded = await getJSON<unknown>(key);
          if (!id || !isVault(loaded, id)) {
            failures += 1;
            console.error(`[moment-sweep] skipped key=${key}`);
          } else {
            const purged = await purgeExpiredSavedMoments(loaded, cutoffDay);
            if (purged.changed) vaultsPurged += 1;
          }
        } catch (error) {
          failures += 1;
          console.error(`[moment-sweep] vault stayed key=${key}`, error);
        }
      }
      lastDone = key;
    }

    if (!page.cursor) {
      if (startedMidway && !didWrap) {
        didWrap = true;
        progress = {};
        await saveProgress(progress);
        continue;
      }
      progress = {};
      await saveProgress(progress);
      return result(true);
    }

    if (page.cursor === progress.pageCursor) {
      failures += 1;
      console.error("[moment-sweep] list cursor did not advance");
      await saveProgress(progress);
      return result(false);
    }

    progress = { pageCursor: page.cursor };
    await saveProgress(progress);
  }

  await saveProgress(progress);
  return result(false);
}
