import { describe, expect, it } from "vitest";
import {
  APP_STORY_MAX,
  APP_STORY_MIN,
  appStoryProblems,
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

  it("trims to 1200 and expands under 400 unless BLOCK", () => {
    const long = `${"You kept the still. ".repeat(80)}The night goes quiet.`;
    const trimmed = trimAppStory(long);
    expect(trimmed.length).toBeLessThanOrEqual(APP_STORY_MAX);
    expect(trimmed.length).toBeGreaterThanOrEqual(APP_STORY_MIN);

    const short = "You kept the still.";
    const expanded = expandAppStory(short);
    expect(expanded.length).toBeGreaterThanOrEqual(APP_STORY_MIN);
    expect(expanded.length).toBeLessThanOrEqual(APP_STORY_MAX);
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
        "The tree stands with blossom open on the branch. Just this warms the looking. Night goes still.",
      ),
    ).toBe(false);
  });
});
