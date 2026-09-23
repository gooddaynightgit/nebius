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

  it("keeps an under-60-word confirmation and trims yarn without padding to 400", () => {
    const reflection =
      "Today, you kept the cold chocolate and the quiet sheets, eaten standing up before it melted. You found one, and the looking is what changed the day.";
    expect(countAppStoryWords(reflection)).toBeLessThanOrEqual(APP_STORY_WORD_MAX);
    expect(countAppStoryWords(reflection)).toBeGreaterThanOrEqual(12);
    expect(countAppStorySentences(reflection)).toBeLessThanOrEqual(APP_STORY_SENTENCE_MAX);
    expect(appStoryProblems(reflection, "")).toEqual([]);
    expect(trimAppStory(reflection).length).toBeLessThanOrEqual(APP_STORY_MAX);
    expect(finishAppStory(reflection)).toBe(reflection);

    const keepsake = [
      "Today, you stood with the bitten chocolate banana on white sheets, cold and sweet where you ate it before it melted.",
      "You named it yourself, and the photo held the melt, the sheets, and the courage of keeping that still.",
      "You found one, and the looking is what changed the day.",
    ].join(" ");
    expect(countAppStoryWords(keepsake)).toBeGreaterThan(40);
    expect(countAppStoryWords(keepsake)).toBeLessThanOrEqual(APP_STORY_WORD_MAX);
    expect(countAppStorySentences(keepsake)).toBeLessThanOrEqual(APP_STORY_SENTENCE_MAX);
    expect(keepsake.length).toBeLessThanOrEqual(APP_STORY_MAX);
    expect(appStoryProblems(keepsake, "")).toEqual([]);
    expect(keepsake.startsWith("Today, you ")).toBe(true);

    const nearHardCap = keepsake.replace(
      "keeping that still.",
      "keeping that still warm, particular, and wholly yours in the quiet morning hour.",
    );
    expect(countAppStoryWords(nearHardCap)).toBeGreaterThan(APP_STORY_WORD_MAX);
    expect(countAppStoryWords(nearHardCap)).toBeLessThanOrEqual(APP_STORY_WORD_HARD_MAX);
    expect(countAppStorySentences(nearHardCap)).toBeLessThanOrEqual(APP_STORY_SENTENCE_MAX);
    expect(appStoryProblems(nearHardCap, "")).toEqual([]);

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
    expect(expanded).toMatch(/^Today, you /);
    expect(expanded).toMatch(/found|looking/i);
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
        "Today, you kept pale petals and bark. You found one, and the looking is what changed the day.",
      ),
    ).toBe(false);
  });

  it("does not treat ordinary caption or whisper words as instruction leak", () => {
    const screenshot =
      "Today, you kept three handwritten lines and the screenshot caption. You found one, and the looking is what changed the day.";
    const steam =
      "Today, you kept a whisper of steam and the kettle. You found one, and the looking is what changed the day.";
    expect(leaksAppStoryInstruction(screenshot)).toBe(false);
    expect(appStoryProblems(screenshot, "")).toEqual([]);
    expect(leaksAppStoryInstruction(steam)).toBe(false);
    expect(appStoryProblems(steam, "")).toEqual([]);
    expect(
      leaksAppStoryInstruction(
        "Today, you kept a prompt hello on the screen. You found one, and the looking is what changed the day.",
      ),
    ).toBe(false);
  });
});
