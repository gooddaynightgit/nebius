import { describe, expect, it } from "vitest";
import {
  APP_STORY_MAX,
  APP_STORY_MIN,
  APP_STORY_SENTENCE_MAX,
  APP_STORY_WORD_HARD_MAX,
  APP_STORY_WORD_MAX,
  appStoryProblems,
  hasHarshBodyLanguage,
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
    expect(appStoryProblems(reflection, "")).toEqual([]);
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

  it("does not treat ordinary caption or whisper words as instruction leak", () => {
    const screenshot =
      "You spent today looking for the good — three handwritten lines, the screenshot caption, a moment that could only belong to you. Kept, it opens the door to more.";
    const steam =
      "You spent today looking for the good — a whisper of steam, the kettle, a moment that could only belong to you. Kept, it opens the door to more.";
    expect(leaksAppStoryInstruction(screenshot)).toBe(false);
    expect(appStoryProblems(screenshot, "")).toEqual([]);
    expect(leaksAppStoryInstruction(steam)).toBe(false);
    expect(appStoryProblems(steam, "")).toEqual([]);
    expect(
      leaksAppStoryInstruction(
        "You spent today looking for the good — a prompt hello on the screen, a moment that could only belong to you. Kept, it opens the door to more.",
      ),
    ).toBe(false);
  });

  it("flags unflattering body language without treating dark chocolate as harsh", () => {
    const insult =
      "You spent today noticing instead of rushing past—wrinkled skin cradling dark chocolate, a moment held like something precious. This quiet pause could only be yours.";
    const kind =
      "You spent today looking for the good instead of scrolling past it — and you found it: cold chocolate, quiet sheets, a moment that could only belong to you. Kept, it opens the door to more.";
    expect(hasHarshBodyLanguage(insult)).toBe(true);
    expect(appStoryProblems(insult, "")).toContain("harsh");
    expect(hasHarshBodyLanguage("old hands holding the mug")).toBe(true);
    expect(hasHarshBodyLanguage("sagging")).toBe(true);
    expect(hasHarshBodyLanguage(kind)).toBe(false);
    expect(hasHarshBodyLanguage("dark chocolate, quiet sheets, wrinkled foil")).toBe(false);
    expect(hasHarshBodyLanguage("a bite of cocoa, the chill, the wrapping")).toBe(false);
    expect(appStoryProblems(kind, "")).toEqual([]);
  });

  it("flags marketing slogans so the closer can retry", () => {
    expect(
      leaksAppStoryInstruction(
        "Anyone can take a photo — today you notice what it was. Cold chocolate, quiet sheets.",
      ),
    ).toBe(true);
    expect(
      leaksAppStoryInstruction(
        "The app doesn't just save your best moment — it rewires your whole day hunting for it.",
      ),
    ).toBe(true);
    expect(appStoryProblems("Anyone can take a photo — today you notice what it was.", "")).toContain(
      "leak",
    );
    expect(
      leaksAppStoryInstruction(
        "You spent today looking for the good instead of scrolling past it — cold chocolate, quiet sheets, a moment that could only belong to you. Kept, it opens the door to more.",
      ),
    ).toBe(false);
  });
});
