import { describe, expect, it } from "vitest";
import { displayStoryText, hasSecondPerson, toFirstPersonStory } from "./first-person";
import { JOY_TYPES } from "./landing";

const SECOND =
  "Today, you paused with sunlight on your fingers, the rich crack of dark chocolate giving way to nuts, a quiet yes in the middle of ordinary air. This moment—tender, sweet, deeply felt—was not rushed. You held it, and it held you. Magnificent you.";

const FIRST =
  "Today, I paused with sunlight on my fingers, the rich crack of dark chocolate giving way to nuts, a quiet yes in the middle of ordinary air. This moment—tender, sweet, deeply felt—was not rushed. I held it, and it held me. Magnificent me.";

describe("first person stories", () => {
  it("rewrites the chocolate keepsake from you to I", () => {
    expect(toFirstPersonStory(SECOND)).toBe(FIRST);
    expect(hasSecondPerson(toFirstPersonStory(SECOND))).toBe(false);
    expect(displayStoryText(SECOND)).toBe(FIRST);
  });

  it("keeps verb agreement and leaves a first-person story untouched", () => {
    expect(toFirstPersonStory("You are here. You were glad. You have the cup.")).toBe(
      "I am here. I was glad. I have the cup.",
    );
    expect(toFirstPersonStory("You're home. You've kept it. You weren't rushed.")).toBe(
      "I'm home. I've kept it. I wasn't rushed.",
    );
    expect(toFirstPersonStory("Your hands. The joy is yours. You turned yourself toward it.")).toBe(
      "My hands. The joy is mine. I turned myself toward it.",
    );
    expect(toFirstPersonStory("And so are you.")).toBe("And so am I.");
    expect(toFirstPersonStory("Fantastic, you hunted one good moment today.")).toBe(
      "Fantastic, I hunted one good moment today.",
    );
    expect(toFirstPersonStory("Magnificent you hunted one good moment today.")).toBe(
      "Magnificent me hunted one good moment today.",
    );
    expect(toFirstPersonStory(FIRST)).toBe(FIRST);
    expect(toFirstPersonStory("A youth in the bayou kept the light.")).toBe(
      "A youth in the bayou kept the light.",
    );
  });

  it("keeps the example story boxes in first person", () => {
    for (const joy of JOY_TYPES) {
      expect(hasSecondPerson(joy.playbackTemplate)).toBe(false);
    }
  });
});
