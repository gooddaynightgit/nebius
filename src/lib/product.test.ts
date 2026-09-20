import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  canPromptEmail,
  canUnlockStory,
  emailVaultId,
  isValidEmail,
  normalizeEmail,
} from "./identity";
import {
  SUPER_WEAVE_SYSTEM,
  isWeavableMoment,
  mockGoodMoment,
  mockStory,
  weavableLines,
} from "./prompts";
import { WeaveNeedsWordsError, weaveStory } from "./weave";
import { stripReasoning } from "./nebius";

describe("funnel", () => {
  it("does not prompt for email before the first capture", () => {
    expect(canPromptEmail(0, null)).toBe(false);
    expect(canUnlockStory(0, null)).toBe(false);
  });

  it("prompts for email only after a capture, and unlocks after email", () => {
    expect(canPromptEmail(1, null)).toBe(true);
    expect(canUnlockStory(1, null)).toBe(false);
    expect(canPromptEmail(2, "amy@email.com")).toBe(false);
    expect(canUnlockStory(1, "amy@email.com")).toBe(true);
  });
});

describe("email", () => {
  it("accepts ordinary addresses and rejects junk", () => {
    expect(isValidEmail("Amy@Email.COM")).toBe(true);
    expect(normalizeEmail("Amy@Email.COM")).toBe("amy@email.com");
    expect(isValidEmail("not-an-email")).toBe(false);
    expect(isValidEmail("")).toBe(false);
  });

  it("keys email vaults by hash, not the address", () => {
    const id = emailVaultId("amy@email.com");
    expect(id.startsWith("em_")).toBe(true);
    expect(id.includes("amy")).toBe(false);
    expect(emailVaultId("amy@email.com")).toBe(emailVaultId("Amy@Email.com"));
  });
});

describe("ingest and weave fallbacks", () => {
  it("keeps a rich voice transcript instead of a vague sound", () => {
    expect(
      mockGoodMoment({
        kind: "voice",
        transcript:
          "I felt so happy that a friend contacted me to ask how I'm doing",
      }),
    ).toMatch(/friend contacted me/i);
    expect(mockGoodMoment({ kind: "voice" })).toMatch(/small sound from the day/);
    expect(mockGoodMoment({ kind: "text", text: "the coffee was warm" })).toMatch(
      /coffee was warm/,
    );
  });

  it("writes a joyful story that keeps her line brightest and closes multifold", () => {
    const line = "Felt happy my friend enquired how am I doing, someone cares about me";
    const story = mockStory([line], "2026-09-20");
    expect(story.title).toMatch(/cares|friend/i);
    expect(story.body).toContain(line);
    expect(story.body.indexOf(line)).toBeLessThan(story.body.indexOf("multifold"));
    expect(story.body).toMatch(/happy/i);
    expect(story.body).toMatch(/cares/i);
    expect(story.body).toMatch(/multifold/i);
    expect(story.body).toMatch(/smile in the chest/i);
    expect(story.body).toMatch(/noticing is earned|let that warmth in/i);
    expect(story.body).toMatch(/why (did it land|would a friend)/i);
    expect(story.body).toMatch(/easy to love|worth the enquiry|caring person/i);
    expect(story.body).not.toMatch(/not as a task/i);
    expect(story.body).not.toMatch(/not a to-do/i);
    expect(story.body).not.toMatch(/darker/i);
    expect(story.body).not.toMatch(/noise of the day thins/i);
    expect(story.body).not.toMatch(/unperformed/i);
  });

  it("refuses empty-voice placeholders as weavable moments", () => {
    expect(
      isWeavableMoment({
        kind: "voice",
        goodMoment: "You left yourself a voice, a small sound from the day.",
      } as never),
    ).toBe(false);
    expect(
      weavableLines([
        { goodMoment: "You left yourself a voice, a small sound from the day." },
        {
          transcript: "I felt so happy that a friend contacted me to ask how I'm doing",
        },
      ]),
    ).toEqual(["I felt so happy that a friend contacted me to ask how I'm doing"]);
  });

  it("asks Super to keep her words brightest, feel joy, and close multifold", () => {
    expect(SUPER_WEAVE_SYSTEM).toMatch(/LEAD with their exact good moment/);
    expect(SUPER_WEAVE_SYSTEM).toMatch(/weaker paraphrase/);
    expect(SUPER_WEAVE_SYSTEM).toMatch(/Narrative spine/);
    expect(SUPER_WEAVE_SYSTEM).toMatch(/lovable \/ good \/ caring \/ worthy/);
    expect(SUPER_WEAVE_SYSTEM).toMatch(/cheesy self-help/);
    expect(SUPER_WEAVE_SYSTEM).toMatch(/not as a task/);
    expect(SUPER_WEAVE_SYSTEM).toMatch(/multifold/);
    expect(SUPER_WEAVE_SYSTEM).toMatch(/smile in the chest/);
    expect(SUPER_WEAVE_SYSTEM).toMatch(/Ban bleak/);
    expect(SUPER_WEAVE_SYSTEM).toMatch(/darker/);
  });

  it("refuses to weave empty-voice placeholders", async () => {
    await expect(
      weaveStory({
        vaultId: "v_test",
        day: "2026-09-20",
        lastNight: null,
        captures: [
          {
            id: "cap_1",
            vaultId: "v_test",
            kind: "voice",
            createdAt: "2026-09-20T10:00:00.000Z",
            day: "2026-09-20",
            goodMoment: "You left yourself a voice, a small sound from the day.",
            ingestStatus: "mock",
          },
        ],
      }),
    ).rejects.toBeInstanceOf(WeaveNeedsWordsError);
  });

  it("strips Nemotron think tags", () => {
    expect(stripReasoning("<think>secret</think>\nHello night")).toBe("Hello night");
  });
});

describe("landing", () => {
  it("has a lime CTA into /app and no email form", () => {
    const src = readFileSync(path.resolve("src/app/page.tsx"), "utf8");
    expect(src).toMatch(/Hear your story — free/);
    expect(src).toMatch(/href="\/app"/);
    expect(src).not.toMatch(/type="email"/);
    expect(src).not.toMatch(/Signup/);
    expect(src).not.toMatch(/you@email.com/);
  });
});

describe("unlock client contract", () => {
  it("sends captures with the email unlock request", () => {
    const src = readFileSync(path.resolve("src/components/CaptureStudio.tsx"), "utf8");
    expect(src).toMatch(/captures: captures\.map\(capturePayload\)/);
    expect(src).toMatch(/Unlocking…/);
    expect(src).toMatch(/unlockError/);
    expect(src).toMatch(/weaveError/);
    expect(src).toMatch(/Type a line about what you said/);
    expect(src).toMatch(/Browser voice \(Sonic coming\)/);
    expect(src).toMatch(/Joyful stand-in \(add NEBIUS_API_KEY for Super\)/);
    expect(src).not.toMatch(/Calm browser voice/);
    expect(src).not.toMatch(/Demo weave/);
    expect(src).not.toMatch(/Warm stand-in/);
  });
});
