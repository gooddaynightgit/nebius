import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { POST } from "@/app/api/joy-match/route";
import { getJoyById, LANDING } from "./landing";
import {
  applyJoyMatchChoice,
  joyMatchModels,
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

  it("does not pretend a witness ran without a photo or a Token Factory key", async () => {
    let called = false;
    const missingPhoto = await witnessJoyMatch({
      joyTitle: "Morning sunlight",
      imageDataUrl: "",
      complete: async () => {
        called = true;
        return { text: "MATCH", model: "test" };
      },
    });
    expect(missingPhoto).toEqual({ kind: "need-photo" });
    expect(called).toBe(false);

    const previous = process.env.NEBIUS_API_KEY;
    delete process.env.NEBIUS_API_KEY;
    try {
      const missingKey = await witnessJoyMatch({
        joyTitle: "Morning sunlight",
        imageDataUrl: "data:image/jpeg;base64,abc",
      });
      expect(missingKey).toEqual({ kind: "unavailable" });
    } finally {
      if (previous === undefined) delete process.env.NEBIUS_API_KEY;
      else process.env.NEBIUS_API_KEY = previous;
    }

    expect(joyMatchModels()).toContain("openbmb/MiniCPM-V-4_5");
    expect(joyMatchModels()).toContain("moonshotai/Kimi-K2.6");
    const route = readFileSync(path.resolve("src/app/api/joy-match/route.ts"), "utf8");
    expect(route).toMatch(/JOY_MATCH_SYSTEM|witnessJoyMatch/);
    expect(route).toMatch(/NEED_PHOTO/);
    expect(route).toMatch(/UNAVAILABLE/);
    expect(route).toMatch(/joy_type/);
  });
});

describe("joy match route", () => {
  it("returns NEED_PHOTO without a file and UNAVAILABLE when the key is absent", async () => {
    const previous = process.env.NEBIUS_API_KEY;
    delete process.env.NEBIUS_API_KEY;
    try {
      const empty = new FormData();
      empty.set("joy_type", "morning-sunlight");
      const needPhoto = await POST(
        new Request("http://localhost/api/joy-match", { method: "POST", body: empty }),
      );
      expect(needPhoto.status).toBe(200);
      expect(await needPhoto.json()).toEqual({ verdict: "NEED_PHOTO" });

      const withFile = new FormData();
      withFile.set("joyType", "morning-sunlight");
      withFile.set("file", new File([Uint8Array.from([1, 2, 3, 4])], "moment.jpg", { type: "image/jpeg" }));
      const unavailable = await POST(
        new Request("http://localhost/api/joy-match", { method: "POST", body: withFile }),
      );
      expect(unavailable.status).toBe(200);
      expect(await unavailable.json()).toEqual({
        verdict: "UNAVAILABLE",
        note: LANDING.app.witnessQuiet,
      });
    } finally {
      if (previous === undefined) delete process.env.NEBIUS_API_KEY;
      else process.env.NEBIUS_API_KEY = previous;
    }
  });
});
