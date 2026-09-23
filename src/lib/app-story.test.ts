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

  it("keeps an under-70-word confirmation and trims yarn without padding to 400", () => {
    const reflection =
      "Wow you kept the cold chocolate and the quiet sheets, eaten standing up before it melted! Lovely on the tongue, bright against the linen, wonderful that you stayed. Fantastic, you found one good moment today — the finding is what's changing you.";
    expect(countAppStoryWords(reflection)).toBeLessThanOrEqual(APP_STORY_WORD_MAX);
    expect(countAppStoryWords(reflection)).toBeGreaterThanOrEqual(12);
    expect(countAppStorySentences(reflection)).toBeLessThanOrEqual(APP_STORY_SENTENCE_MAX);
    expect(appStoryProblems(reflection, "")).toEqual([]);
    expect(trimAppStory(reflection).length).toBeLessThanOrEqual(APP_STORY_MAX);
    expect(finishAppStory(reflection)).toBe(reflection);

    const keepsake = [
      "Oooh you stood with the bitten chocolate banana on white sheets, cold and sweet where you ate it before it melted!",
      "Lovely in the hand, bright on the sheets, wonderful that you named it.",
      "Fantastic, you hunted one good moment today, and the hunting became your happiness, your joy.",
    ].join(" ");
    expect(countAppStoryWords(keepsake)).toBeGreaterThan(40);
    expect(countAppStoryWords(keepsake)).toBeLessThanOrEqual(APP_STORY_WORD_MAX);
    expect(countAppStorySentences(keepsake)).toBeLessThanOrEqual(APP_STORY_SENTENCE_MAX);
    expect(keepsake.length).toBeLessThanOrEqual(APP_STORY_MAX);
    expect(appStoryProblems(keepsake, "")).toEqual([]);
    expect(keepsake).toMatch(/^(Oooh you|Today\b|Wow you|How awesome is this, you|Brilliant\b|Look at you)/);

    let nearHardCap = keepsake;
    while (countAppStoryWords(nearHardCap) <= APP_STORY_WORD_MAX) {
      nearHardCap = nearHardCap.replace(
        "wonderful that you named it",
        "wonderful that you named it softly",
      );
    }
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
    expect(expanded).toMatch(/^(Oooh you|Today\b|Wow you|How awesome is this, you|Brilliant\b|Look at you)/);
    expect(expanded).toMatch(/\b(Fantastic|Wonderful|Perfect|Beautiful|Yes), you\b/);
    expect(expanded).toMatch(/hunted one good moment today|found one good moment today|becoming someone who looks/);
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
        "Look at you keeping pale petals and bark, lovely, bright, and wonderful. Fantastic, you hunted one good moment today, and the hunting became your happiness, your joy.",
      ),
    ).toBe(false);
  });

  it("does not treat ordinary caption or whisper words as instruction leak", () => {
    const screenshot =
      "Look at you keeping three handwritten lines and the screenshot caption, lovely and bright and wonderful. Fantastic, you hunted one good moment today, and the hunting became your happiness, your joy.";
    const steam =
      "Wow you kept a whisper of steam and the kettle! Lovely in the quiet, bright on the metal, wonderful that you stayed. Yes, you hunted one good moment today, and the hunting became your happiness, your joy.";
    expect(leaksAppStoryInstruction(screenshot)).toBe(false);
    expect(appStoryProblems(screenshot, "")).toEqual([]);
    expect(leaksAppStoryInstruction(steam)).toBe(false);
    expect(appStoryProblems(steam, "")).toEqual([]);
    expect(
      leaksAppStoryInstruction(
        "Brilliant, you kept a prompt hello on the screen, lovely and bright and sweet. Perfect, you hunted one good moment today, capturing it, becoming someone who looks.",
      ),
    ).toBe(false);
  });
});
