import { splitKeepsakeClosing } from "./affirmation";
import { toFirstPersonStory } from "./first-person";
import { clockInTimeZone } from "./latest-moments";
import { keptSavedMoments } from "./moment-expiry";
import type { CaptureRecord, StoryRecord } from "./types";

export const SAVED_TODAY_LABEL = "My saved moments \u2013 disappears at 23:59 tonight";
export const SAVED_TODAY_EMPTY = "No saved moments yet today.";
export const SAST_TIME_ZONE = "Africa/Johannesburg";
export const STORY_LEAD_WORDS = 12;

export type TodaySavedMoment = {
  id: string;
  day: string;
  createdAt: string;
  captureId: string | null;
  excerpt: string;
  time: string;
};

/** 24-hour clock in South African Standard Time. */
export function savedMomentTimeSast(createdAt: string): string {
  return clockInTimeZone(createdAt, SAST_TIME_ZONE);
}

/** First words of the woven story, without the closing line. */
export function storyLead(body: string, words = STORY_LEAD_WORDS): string {
  const story = splitKeepsakeClosing(toFirstPersonStory(body)).story.replace(/\s+/g, " ").trim();
  if (!story) return "";
  const parts = story.split(" ");
  if (parts.length <= words) return story;
  return `${parts.slice(0, words).join(" ")}\u2026`;
}

/**
 * Every saved moment still inside today's local day.
 * Yesterday's rows are already expired at 00:00. Nothing here is deleted.
 */
export function todaySavedMoments(
  stories: readonly StoryRecord[],
  captures: readonly CaptureRecord[],
  today: string,
): TodaySavedMoment[] {
  const kept = keptSavedMoments(stories, today);
  kept.sort((a, b) => {
    const byTime = b.createdAt.localeCompare(a.createdAt);
    if (byTime !== 0) return byTime;
    return b.id.localeCompare(a.id);
  });
  return kept.map((story) => {
    const captureId = story.captureIds[0] ?? null;
    const photo = captureId ? captures.find((capture) => capture.id === captureId) : undefined;
    return {
      id: story.id,
      day: story.day,
      createdAt: story.createdAt,
      captureId: photo?.mediaKey ? photo.id : null,
      excerpt: storyLead(story.body),
      time: savedMomentTimeSast(story.createdAt),
    };
  });
}
