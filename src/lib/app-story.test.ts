import { describe, expect, it } from "vitest";
import {
  APP_STORY_MAX,
  APP_STORY_MIN,
  APP_STORY_SENTENCE_MAX,
  APP_STORY_WORD_HARD_MAX,
  APP_STORY_WORD_MAX,
  appStoryProblems,
  countAppStorySentences,
  countAppStoryWords,
  expandAppStory,
  finishAppStory,
  isWeaveBlock,
  leaksAppStoryInstruction,
  normalizeAppStory,
  parseAppWeaveReply,
  trimAppStory,
} from "./app-story";

describe("app story length and BLOCK", () => {
  it("treats only a bare BLOCK as a refusal", () => {
    expect(isWeaveBlock("BLOCK")).toBe(true);
    expect(isWeaveBlock("  `BLOCK`  ")).toBe(true);
    expect(isWeaveBlock("block.")).toBe(true);
    expect(isWeaveBlock("BLOCK\n")).toBe(true);
    expect(isWeaveBlock("BLOCK this story")).toBe(false);
    expect(isWeaveBlock("You kept the still.")).toBe(false);
  });

  it("strips titles, hashtags, and fences from model output", () => {
    const body = normalizeAppStory("Title: A pep talk\n\nYou kept the kettle. #joy ☀️\n");
    expect(body).not.toMatch(/title:/i);
    expect(body).not.toMatch(/#joy/);
    expect(body).toMatch(/kettle/);
  });

  it("keeps a ~35-word reflection and trims yarn without padding to 400", () => {
    const reflection =
      "You spent today looking for the good instead of scrolling past it — cold chocolate, quiet sheets, a moment that could only belong to you. Kept, it opens the door to more.";
    expect(countAppStoryWords(reflection)).toBeLessThanOrEqual(APP_STORY_WORD_MAX + 4);
    expect(countAppStorySentences(reflection)).toBeLessThanOrEqual(APP_STORY_SENTENCE_MAX);
    expect(appStoryProblems(reflection, "")).not.toContain("short");
    expect(appStoryProblems(reflection, "")).not.toContain("long");
    expect(trimAppStory(reflection).length).toBeLessThanOrEqual(APP_STORY_MAX);
    expect(finishAppStory(reflection)).toBe(reflection);

    const yarn = `${"You kept the still. ".repeat(80)}The night goes quiet.`;
    const trimmed = trimAppStory(yarn);
    expect(trimmed.length).toBeLessThanOrEqual(APP_STORY_MAX);
    expect(countAppStorySentences(trimmed)).toBeLessThanOrEqual(APP_STORY_SENTENCE_MAX);
    expect(countAppStoryWords(trimmed)).toBeLessThanOrEqual(APP_STORY_WORD_HARD_MAX);

    const short = "You kept the still.";
    const expanded = expandAppStory(short);
    expect(expanded.length).toBeGreaterThanOrEqual(APP_STORY_MIN);
    expect(expanded.length).toBeLessThanOrEqual(APP_STORY_MAX);
    expect(countAppStorySentences(expanded)).toBeLessThanOrEqual(APP_STORY_SENTENCE_MAX);
    expect(expanded).toMatch(/door/i);
    expect(parseAppWeaveReply("BLOCK")).toBe("BLOCK");
    expect(finishAppStory(short).length).toBeGreaterThanOrEqual(APP_STORY_MIN);
    expect(leaksAppStoryInstruction(expanded)).toBe(false);
    expect(appStoryProblems(expanded, "")).not.toContain("leak");
  });

  it("flags instruction-echoing negatives as a story problem", () => {
    const leaked =
      "You kept what the frame actually holds — Blossomimg tree — and nothing else is added to the picture. Beside the image sits only the whisper you wrote — Blossomimg tree — and never more than those words. Just this is only a colour at the edge of this hour, warm and quiet, not a lecture and not a list.";
    expect(leaksAppStoryInstruction(leaked)).toBe(true);
    expect(appStoryProblems(leaked, "")).toContain("leak");
    expect(
      leaksAppStoryInstruction(
        "You spent today gathering the good — pale petals, bark, a moment that could only belong to you. Kept, it opens the door to more.",
      ),
    ).toBe(false);
  });
});
