/** Today's good moment is saved when YOURS, the photo, or the phone stash exists. */
export function hasSavedGoodMoment(input: {
  todayPhoto?: unknown;
  yoursOpened?: boolean;
  lastStory?: unknown;
  stash?: unknown;
}): boolean {
  return Boolean(input.stash || input.todayPhoto || input.yoursOpened || input.lastStory);
}
