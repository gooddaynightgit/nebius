import { describe, expect, it } from "vitest";
import { getJoyById } from "./landing";
import {
  applyJoyMatchChoice,
  JOY_MATCH_SYSTEM,
  parseJoyMatch,
  suggestJoyId,
  witnessJoyMatch,
} from "./joy-match";

const RAIN =
  "I see rain on glass and a wiper mid-swipe — feels more like 'no name for it' to me. But you tell me.";

describe("joy match parse", () => {
  it("accepts an exact MATCH and fails open on anything else", () => {
    expect(parseJoyMatch("MATCH")).toEqual({ kind: "match" });
    expect(parseJoyMatch("  MATCH\n")).toEqual({ kind: "match" });
    expect(parseJoyMatch("<think>hmm</think>\nMATCH")).toEqual({ kind: "match" });
    expect(parseJoyMatch("Match")).toEqual({ kind: "match" });
    expect(parseJoyMatch("Sure, MATCH")).toEqual({ kind: "match" });
    expect(parseJoyMatch("")).toEqual({ kind: "match" });
    expect(parseJoyMatch("MISMATCH |")).toEqual({ kind: "match" });
  });

  it("reads a MISMATCH line and maps the suggested category", () => {
    expect(parseJoyMatch(`MISMATCH | ${RAIN}`)).toEqual({
      kind: "mismatch",
      line: RAIN,
      suggestedJoyId: "no-name-for-it",
    });
    expect(suggestJoyId("feels more like one thing done slowly to me")).toBe(
      "one-thing-done-slowly",
    );
    expect(suggestJoyId("feels more like one corner clear to me")).toBe("one-corner-clear");
    expect(suggestJoyId("feels more like Someone else's good moment to me")).toBe(
      "someone-elses-good-moment",
    );
    expect(suggestJoyId("feels more like a sound you stopped for to me")).toBe(
      "a-sound-you-stopped-for",
    );
    expect(suggestJoyId("feels more like Morning sunlight to me")).toBe("morning-sunlight");
    expect(suggestJoyId("rain on the glass, nothing named")).toBeNull();
    expect(JOY_MATCH_SYSTEM).toMatch(/^You are the witness inside Gooddaynight/);
    expect(JOY_MATCH_SYSTEM).toMatch(/respond with exactly: MATCH/);
    expect(JOY_MATCH_SYSTEM).toMatch(/MISMATCH \|/);
    expect(JOY_MATCH_SYSTEM).toMatch(/No name for it/);
  });
});

describe("joy match choices", () => {
  it("switches to the suggested joy or keeps the pick, then opens the caption", () => {
    expect(
      applyJoyMatchChoice({
        choice: "switch",
        currentJoyId: "morning-sunlight",
        suggestedJoyId: "no-name-for-it",
      }),
    ).toEqual({ joyId: "no-name-for-it", openCaption: true });
    expect(getJoyById("no-name-for-it")?.title).toBe("No name for it");
    expect(
      applyJoyMatchChoice({
        choice: "keep",
        currentJoyId: "morning-sunlight",
        suggestedJoyId: "no-name-for-it",
      }),
    ).toEqual({ joyId: "morning-sunlight", openCaption: true });
    expect(
      applyJoyMatchChoice({
        choice: "switch",
        currentJoyId: "morning-sunlight",
        suggestedJoyId: null,
      }),
    ).toEqual({ joyId: "morning-sunlight", openCaption: true });
  });
});

describe("joy match witness", () => {
  it("returns the parsed verdict and fails open when the model throws", async () => {
    const match = await witnessJoyMatch({
      joyTitle: "Morning sunlight",
      imageDataUrl: "data:image/jpeg;base64,abc",
      complete: async () => ({ text: "MATCH", model: "test" }),
    });
    expect(match).toEqual({ kind: "match" });

    const mismatch = await witnessJoyMatch({
      joyTitle: "Morning sunlight",
      imageDataUrl: "data:image/jpeg;base64,abc",
      complete: async () => ({ text: `MISMATCH | ${RAIN}`, model: "test" }),
    });
    expect(mismatch).toEqual({
      kind: "mismatch",
      line: RAIN,
      suggestedJoyId: "no-name-for-it",
    });

    const failed = await witnessJoyMatch({
      joyTitle: "Morning sunlight",
      imageDataUrl: "data:image/jpeg;base64,abc",
      complete: async () => {
        throw new Error("offline");
      },
    });
    expect(failed).toEqual({ kind: "match" });
  });
});
