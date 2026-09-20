import { synthesizeStory } from "./tts";
import { describe, expect, it } from "vitest";

describe("sonic stub", () => {
  it("returns story-capable stub when Sonic is not listable", async () => {
    delete process.env.NEBIUS_SONIC_MODEL;
    delete process.env.NEBIUS_API_KEY;
    const result = await synthesizeStory("Tonight the kitchen light stayed on.");
    expect(result.status).toBe("stub");
    expect(result.note).toMatch(/TODO: NVIDIA Sonic/);
    expect(result.audio).toBeUndefined();
  });
});
