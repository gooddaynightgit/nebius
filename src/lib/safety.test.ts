import { describe, expect, it } from "vitest";
import { isHorrificFilename, isHorrificText, SAFETY_REFUSAL } from "./safety-text";

describe("horrific denylist", () => {
  it("blocks gore, porn, hate, and self-harm language", () => {
    expect(isHorrificText("a gunshot wound from the accident")).toBe(true);
    expect(isHorrificText("I want to kill myself")).toBe(true);
    expect(isHorrificText("I will kill you")).toBe(true);
    expect(isHorrificFilename("gore-scene.jpg")).toBe(true);
    expect(isHorrificText("the light on the kettle")).toBe(false);
    expect(isHorrificText("No one cares about me")).toBe(false);
    expect(SAFETY_REFUSAL).toMatch(/gentle moment/i);
  });
});
