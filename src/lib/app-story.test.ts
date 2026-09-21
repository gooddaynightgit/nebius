import { describe, expect, it } from "vitest";
import {
  APP_STORY_MAX,
  APP_STORY_MIN,
  expandAppStory,
  finishAppStory,
  isWeaveBlock,
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
  });
});
