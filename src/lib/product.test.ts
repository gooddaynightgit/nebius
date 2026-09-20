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
import { mockGoodMoment, mockStory } from "./prompts";
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
  it("extracts a gentle mock moment from thin captures", () => {
    expect(mockGoodMoment({ kind: "photo" })).toMatch(/picture/i);
    expect(mockGoodMoment({ kind: "text", text: "the coffee was warm" })).toMatch(
      /coffee was warm/,
    );
  });

  it("writes a bedtime story from moments without an API key", () => {
    const story = mockStory(["You laughed on the stairs."], "2026-09-20");
    expect(story.title).toBeTruthy();
    expect(story.body).toMatch(/You laughed on the stairs/);
    expect(story.body).toMatch(/Something good already happened/);
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
