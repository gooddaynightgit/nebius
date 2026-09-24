/** A new story’s id. The same id is reused for a retry or a re-save so it is charged once. */
export function newMomentId(): string {
  const cryptoApi = globalThis.crypto;
  const raw =
    cryptoApi && typeof cryptoApi.randomUUID === "function"
      ? cryptoApi.randomUUID()
      : `${Date.now().toString(16)}${Math.random().toString(16).slice(2)}`;
  return `mom_${raw.replace(/-/g, "").slice(0, 20)}`;
}

const MOMENT_ID = /^mom_[A-Za-z0-9]{8,80}$/;

export function isMomentId(value: string): boolean {
  return MOMENT_ID.test(value);
}

/**
 * A leftover pending photo is not the picture on screen when a saved moment exists.
 * Restore it only for the draft the buyer is actually in.
 */
export function shouldRestorePending(input: {
  hasSavedMoment: boolean;
  hasPending: boolean;
  pendingMomentId?: string | null;
  activeMomentId?: string | null;
}): boolean {
  if (!input.hasPending) return false;
  if (
    input.pendingMomentId &&
    input.activeMomentId &&
    input.pendingMomentId === input.activeMomentId
  ) {
    return true;
  }
  if (input.hasSavedMoment) return false;
  if (
    input.pendingMomentId &&
    input.activeMomentId &&
    input.pendingMomentId !== input.activeMomentId
  ) {
    return false;
  }
  return true;
}

/** A late takePhoto must not overwrite a newer pick or a different moment. */
export function acceptPendingWrite(input: {
  writeGeneration: number;
  currentGeneration: number;
  writeMomentId: string;
  activeMomentId: string | null;
}): boolean {
  if (!input.activeMomentId || input.writeMomentId !== input.activeMomentId) return false;
  return input.writeGeneration === input.currentGeneration;
}

/** Zero credits leaves the photo step and opens Unlock. */
export function startNewStoryDestination(
  status: "open" | "exhausted" | "closed" | "unknown" | "error",
): "/moments" | null {
  if (status === "exhausted") return "/moments";
  return null;
}

const ACTIVE_MOMENT_KEY = "gooddaynight.activeMoment";

type ActiveMoment = { day: string; momentId: string };

function momentStorage(): Storage | null {
  try {
    return typeof sessionStorage === "undefined" ? null : sessionStorage;
  } catch {
    return null;
  }
}

export function writeActiveMoment(day: string, momentId: string): void {
  try {
    momentStorage()?.setItem(ACTIVE_MOMENT_KEY, JSON.stringify({ day, momentId }));
  } catch {
    // The in-memory ref still covers this page.
  }
}

export function readActiveMoment(day: string): string | null {
  try {
    const raw = momentStorage()?.getItem(ACTIVE_MOMENT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ActiveMoment;
    if (parsed.day !== day || !isMomentId(parsed.momentId)) return null;
    return parsed.momentId;
  } catch {
    return null;
  }
}

export function clearActiveMoment(): void {
  try {
    momentStorage()?.removeItem(ACTIVE_MOMENT_KEY);
  } catch {
    // Ignore storage failures.
  }
}

const NEW_STORY_DRAFT_KEY = "gooddaynight.newStoryDraft";

/** Remember a fresh moment so the photo page opens in a new draft after leaving the story. */
export function markNewStoryDraft(day: string, momentId: string): void {
  writeActiveMoment(day, momentId);
  try {
    momentStorage()?.setItem(NEW_STORY_DRAFT_KEY, JSON.stringify({ day, momentId }));
  } catch {
    // The photo page still reads the active moment.
  }
}

export function readNewStoryDraft(day: string): string | null {
  try {
    const raw = momentStorage()?.getItem(NEW_STORY_DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ActiveMoment;
    if (parsed.day !== day || !isMomentId(parsed.momentId)) return null;
    return parsed.momentId;
  } catch {
    return null;
  }
}

export function clearNewStoryDraft(): void {
  try {
    momentStorage()?.removeItem(NEW_STORY_DRAFT_KEY);
  } catch {
    // Ignore storage failures.
  }
}
