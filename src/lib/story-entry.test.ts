import { describe, expect, it } from "vitest";
import { createStoryDestination } from "./story-entry";

describe("Create your story routing", () => {
  it("sends a signed-out visitor to sign-in", () => {
    expect(createStoryDestination(false, 0)).toBe("sign-in");
    expect(createStoryDestination(false, 40)).toBe("sign-in");
  });

  it("sends a signed-in buyer with credits to pick a joy", () => {
    expect(createStoryDestination(true, 1)).toBe("/app/joy");
    expect(createStoryDestination(true, 40)).toBe("/app/joy");
  });

  it("sends a signed-in buyer with zero credits to the buy page", () => {
    expect(createStoryDestination(true, 0)).toBe("/moments");
    expect(createStoryDestination(true, -1)).toBe("/moments");
  });
});
