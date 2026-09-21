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
import { chooseSpokenLine, cleanSpokenLine, isSelfNegating, proposeSpokenLine } from "./care";
import {
  SUPER_WEAVE_SYSTEM,
  displayMoment,
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
    expect(SUPER_WEAVE_SYSTEM).toMatch(/silver lining/);
    expect(SUPER_WEAVE_SYSTEM).toMatch(/no one cares about me/);
    expect(SUPER_WEAVE_SYSTEM).toMatch(/not as a task/);
    expect(SUPER_WEAVE_SYSTEM).toMatch(/multifold/);
    expect(SUPER_WEAVE_SYSTEM).toMatch(/smile in the chest/);
    expect(SUPER_WEAVE_SYSTEM).toMatch(/Ban bleak/);
    expect(SUPER_WEAVE_SYSTEM).toMatch(/darker/);
  });

  it("cleans obvious typos without corporate rewrite", () => {
    expect(
      cleanSpokenLine("Felt happpy my freind enquiered how am i doing, someone cares about me"),
    ).toBe("Felt happy my friend enquired how am I doing, someone cares about me");
    expect(proposeSpokenLine("My friend enquired how am I doung").corrected).toMatch(
      /how am I doing/i,
    );
    expect(proposeSpokenLine("My friend enquired how am I doung").changed).toBe(true);
    expect(proposeSpokenLine("someone cares aboute me").corrected).toMatch(/about me/i);
    expect(proposeSpokenLine("how idoing").corrected).toMatch(/I'm doing/i);
    expect(chooseSpokenLine("how am I doung", "corrected")).toMatch(/doing/i);
    expect(chooseSpokenLine("how am I doung", "keep")).toMatch(/doung/i);
    expect(chooseSpokenLine("how am I doung", "none")).toBe("how am I doung");
  });

  it("does not treat a misspelled friend check-in as a silver lining", () => {
    const shown = displayMoment({
      text: "My friend enquired how am I doing",
    });
    expect(shown.reframed).toBe(false);
    expect(shown.line).toMatch(/friend enquired/i);
    expect(shown.line).not.toMatch(/silver lining/i);
    const kept = displayMoment({
      text: "My friend enquired how am I doung",
    });
    expect(kept.reframed).toBe(false);
    expect(kept.line).not.toMatch(/silver lining/i);
  });

  it("does not treat despair as a good moment", () => {
    expect(isSelfNegating("No one cares about me")).toBe(true);
    expect(
      mockGoodMoment({ kind: "text", text: "No one cares about me" }),
    ).not.toMatch(/no one cares about me/i);
    expect(mockGoodMoment({ kind: "text", text: "No one cares about me" })).toMatch(
      /silver lining|heart loves connection|wish to be cared/i,
    );
    expect(
      weavableLines([{ text: "No one cares about me" }])[0],
    ).not.toMatch(/no one cares about me/i);
  });

  it("turns despair into a silver-lining story, never celebrating the wound", () => {
    const story = mockStory(["No one cares about me"], "2026-09-20");
    expect(story.body).not.toMatch(/no one cares about me/i);
    expect(story.body).toMatch(/silver lining/i);
    expect(story.body).toMatch(/heart that loves connection|worth caring about/i);
    expect(story.body).toMatch(/multifold/i);
    expect(story.body).not.toMatch(/not as a task/i);
  });

  it("weaves the confirmed correction, not the typo", () => {
    const messy = "My friend enquired how am I doung";
    const cleaned = proposeSpokenLine(messy).corrected;
    const story = mockStory([cleaned], "2026-09-20");
    expect(cleaned).toMatch(/how am I doing/i);
    expect(story.body).toContain(cleaned);
    expect(story.body).toMatch(/why would a friend|friend/i);
    expect(story.body).not.toMatch(/doung/i);
  });

  it("weaves a silver lining instead of celebrating despair", async () => {
    const story = await weaveStory({
      vaultId: "v_test",
      day: "2026-09-20",
      lastNight: null,
      captures: [
        {
          id: "cap_sad",
          vaultId: "v_test",
          kind: "text",
          createdAt: "2026-09-20T10:00:00.000Z",
          day: "2026-09-20",
          text: "No one cares about me",
          ingestStatus: "mock",
        },
      ],
    });
    expect(story.body).not.toMatch(/no one cares about me/i);
    expect(story.body).toMatch(/silver lining|heart that loves connection/i);
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
  const page = readFileSync(path.resolve("src/app/page.tsx"), "utf8");
  const copy = readFileSync(path.resolve("src/lib/landing.ts"), "utf8");
  const accordion = readFileSync(path.resolve("src/components/MomentAccordion.tsx"), "utf8");
  const styles = readFileSync(path.resolve("src/app/globals.css"), "utf8");

  it("has a lime CTA into /app and no email form", () => {
    expect(page).toMatch(/href="\/app"/);
    expect(copy).toMatch(/Hear your story — free/);
    expect(page).not.toMatch(/type="email"/);
    expect(accordion).not.toMatch(/type="email"/);
    expect(page).not.toMatch(/Signup/);
    expect(page).not.toMatch(/you@email.com/);
  });

  it("keeps verbatim hero, joy types, and footer copy", () => {
    expect(copy).toContain(
      "You scrolled past a hundred good moments today. None of them were yours.",
    );
    expect(copy).toContain(
      "Your laugh. Your small win. Your quiet moment. Nobody turned them into anything — not even you. Gooddaynight does.",
    );
    expect(copy).toContain(
      "Snap one good moment from your day. Gooddaynight reads it back to you as a beautiful story — your own.",
    );
    expect(copy).toContain(
      "One good moment remembered today. More spotted tomorrow. Day by day, one unfolds in multifolds.",
    );
    expect(copy).toContain("One good moment today");
    expect(copy).toContain("Lay the picture here.");
    expect(copy).toContain("What kind of quiet joy was it? (pick one)");
    expect(copy).toContain("You can change the picture if the day gets kinder.");
    expect(copy).toContain("One moment. One story.");
    expect(copy).toContain("Something good is about to happen!");
    expect(copy).toContain("Gooddaynight.com");
    for (const title of [
      "Morning sunlight",
      "A small hello",
      "One thing, done slowly",
      "A little movement",
      "One corner, clear",
      "Just this",
    ]) {
      expect(copy).toContain(title);
    }
    expect(copy).toContain(
      "This morning, you stood in the sun. Ten quiet minutes. Gold on your skin.",
    );
    expect(copy).toContain("You turned yourself ON.");
    expect(copy).toContain("You were THERE — fully, radiantly, joyfully there.");
  });

  it("opens story playback from radios in pale lavender panels", () => {
    expect(accordion).toMatch(/type="radio"/);
    expect(accordion).toMatch(/name="quiet-joy"/);
    expect(accordion).toMatch(/Story playback/);
    expect(accordion).toMatch(/className="playback"/);
    expect(styles).toMatch(/#f0f0ff/);
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
    expect(src).toMatch(/SILVER_LINING_NOTE|We kept the silver lining/);
    expect(src).toMatch(/Save corrected version\?/);
    expect(src).toMatch(/Yes, save this/);
    expect(src).toMatch(/Keep as typed/);
    expect(src).toMatch(/spellDecision/);
  });
});
