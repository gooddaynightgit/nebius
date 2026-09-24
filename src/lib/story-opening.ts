/** Buyer-facing lines while My Good Moment is processing. Exact wording. */
export const STORY_OPENING_LINES = [
  "Something good is coming my way",
  "Quiet joys worth keeping",
  "Finding my good moment is changing me",
  "Letting the habit of looking rewire how I feel",
  "Your good moment story is being carefully weaved, thank you for your patience.",
] as const;

/** Readable pause between lines. Last line holds; the sequence does not loop. */
export const STORY_OPENING_INTERVAL_MS = 5500;

export function nextStoryOpeningIndex(index: number): number {
  const last = STORY_OPENING_LINES.length - 1;
  if (index >= last) return last;
  return index + 1;
}
