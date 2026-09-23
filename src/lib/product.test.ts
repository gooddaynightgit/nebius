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
  APP_EXCAVATE_SYSTEM,
  APP_REFLECT_SYSTEM,
  SUPER_WEAVE_SYSTEM,
  displayMoment,
  isWeavableMoment,
  mockGoodMoment,
  mockStory,
  weavableLines,
} from "./prompts";
import { WeaveNeedsWordsError, weaveStory } from "./weave";
import { stripReasoning, uniqueModels, visionModels, appStoryModels, appStoryTextModels, appStoryVisionModels, isImage2TextCloser } from "./nebius";
import { MODELS } from "./config";

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
    expect(SUPER_WEAVE_SYSTEM).toMatch(/Lead with their exact good moment/);
    expect(SUPER_WEAVE_SYSTEM).toMatch(/keep their sentence undiluted/);
    expect(SUPER_WEAVE_SYSTEM).toMatch(/Narrative spine/);
    expect(SUPER_WEAVE_SYSTEM).toMatch(/lovable \/ good \/ caring \/ worthy/);
    expect(SUPER_WEAVE_SYSTEM).toMatch(/Soft wonder/);
    expect(SUPER_WEAVE_SYSTEM).toMatch(/silver lining/);
    expect(SUPER_WEAVE_SYSTEM).toMatch(/despair wording from the capture/);
    expect(SUPER_WEAVE_SYSTEM).toMatch(/noticing and keeping/);
    expect(SUPER_WEAVE_SYSTEM).toMatch(/multifold/);
    expect(SUPER_WEAVE_SYSTEM).toMatch(/smile in the chest/);
    expect(SUPER_WEAVE_SYSTEM).toMatch(/Prefer presence over emptiness/);
    expect(SUPER_WEAVE_SYSTEM).toMatch(/hunted good moment/);
    expect(APP_EXCAVATE_SYSTEM).toMatch(/Do not write a bedtime story/);
    expect(APP_EXCAVATE_SYSTEM).toMatch(/sensory ingredients ONLY/);
    expect(APP_EXCAVATE_SYSTEM).toMatch(/no people/);
    expect(APP_EXCAVATE_SYSTEM).toMatch(/CAPTION WHISPER/);
    expect(APP_EXCAVATE_SYSTEM).toMatch(/Reply only: `BLOCK`/);
    expect(APP_EXCAVATE_SYSTEM).not.toMatch(/4–6 short sentences/);
    expect(APP_REFLECT_SYSTEM).toMatch(/warm, excited witness/);
    expect(APP_REFLECT_SYSTEM).toMatch(/hunt one good moment a day/);
    expect(APP_REFLECT_SYSTEM).toMatch(/three sacred things/);
    expect(APP_REFLECT_SYSTEM).toMatch(/under 70 words/);
    expect(APP_REFLECT_SYSTEM).toMatch(/Oooh you/);
    expect(APP_REFLECT_SYSTEM).toMatch(/How awesome is this, you/);
    expect(APP_REFLECT_SYSTEM).toMatch(/Look at you/);
    expect(APP_REFLECT_SYSTEM).toMatch(/at least three exciting positive words/);
    expect(APP_REFLECT_SYSTEM).toMatch(/Fantastic/);
    expect(APP_REFLECT_SYSTEM).toMatch(/the hunting became your happiness/);
    expect(APP_REFLECT_SYSTEM).toMatch(/the finding is what's changing you/);
    expect(APP_REFLECT_SYSTEM).toMatch(/becoming someone who looks/);
    expect(APP_REFLECT_SYSTEM).toMatch(/Soft exclamation/);
    expect(APP_REFLECT_SYSTEM).toMatch(/chosen joy/);
    expect(APP_REFLECT_SYSTEM).not.toMatch(/4–6 short sentences/);
    expect(APP_REFLECT_SYSTEM).not.toMatch(/600–900 characters/);
    expect(APP_REFLECT_SYSTEM).not.toMatch(/1,200 characters/);
    expect(APP_REFLECT_SYSTEM).not.toMatch(/Never shorter than \*\*400\*\*/);
    expect(APP_REFLECT_SYSTEM).not.toMatch(/gifted warm writer/);
    expect(APP_REFLECT_SYSTEM).not.toMatch(/First line MUST be: Title/);
    expect(APP_REFLECT_SYSTEM).not.toMatch(/180–280 words/);
    expect(APP_REFLECT_SYSTEM).not.toMatch(/Max ~35 words/);
    expect(APP_REFLECT_SYSTEM).not.toMatch(/four beats/);
    expect(APP_REFLECT_SYSTEM).toMatch(/\byou\b/i);
    expect(APP_REFLECT_SYSTEM).not.toMatch(/Analyze the photo first/);
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

  it("rewrites joy playback templates instead of dumping them as the story", async () => {
    const { JOY_TYPES } = await import("./landing");
    const { mockJoyStory, usesCannedPlayback, CANNED_PLAYBACK_MARKERS } = await import("./prompts");
    const { APP_STORY_MIN, APP_STORY_MAX, APP_STORY_SENTENCE_MAX, APP_STORY_WORD_MAX, APP_STORY_WELLNESS_RE, countAppStorySentences, countAppStoryWords } = await import("./app-story");
    for (const joy of JOY_TYPES) {
      const story = mockJoyStory({
        joy,
        caption: "the kettle caught the light",
        goodMoment: "Steam over the kettle in the morning window.",
        day: "2026-09-21",
      });
      expect(usesCannedPlayback(story.body, joy.playbackTemplate)).toBe(false);
      expect(usesCannedPlayback(joy.playbackTemplate, joy.playbackTemplate)).toBe(true);
      for (const marker of CANNED_PLAYBACK_MARKERS) {
        expect(story.body).not.toContain(marker);
      }
      expect(story.title).toBe("");
      expect(story.body.length).toBeGreaterThanOrEqual(APP_STORY_MIN);
      expect(story.body.length).toBeLessThanOrEqual(APP_STORY_MAX);
      expect(countAppStoryWords(story.body)).toBeLessThanOrEqual(APP_STORY_WORD_MAX);
      expect(countAppStorySentences(story.body)).toBeLessThanOrEqual(APP_STORY_SENTENCE_MAX);
      expect(story.body).not.toMatch(APP_STORY_WELLNESS_RE);
      expect(story.body).not.toMatch(/#\w/);
      expect(story.body).not.toMatch(/^title:/im);
      expect(story.body).not.toContain(joy.title);
      expect(story.body).not.toMatch(/Just this is|One corner clear/i);
      expect(story.body).toMatch(
        /^(Oooh you|Today\b|Wow you|How awesome is this, you|Brilliant\b|Look at you)/,
      );
      expect(story.body).toMatch(/\b(Fantastic|Wonderful|Perfect|Beautiful|Yes), you\b/);
      expect(story.body).toMatch(
        /hunted one good moment today|found one good moment today|becoming someone who looks/,
      );
      expect(
        story.body.match(
          /\b(awesome|brilliant|wonderful|lovely|radiant|beautiful|glowing|precious|stunning|sweet|bright|marvelous|glorious|delightful)\b/gi,
        )?.length ?? 0,
      ).toBeGreaterThanOrEqual(3);
      expect(story.body).toMatch(/kettle|steam/i);
      expect(story.body).not.toMatch(/nothing else|never more|not a lecture|not a list|do not have to|beside the image sits/i);
    }
  });

  it("writes a blossoming-tree moment warmly, without instruction-echo", async () => {
    const { JOY_TYPES } = await import("./landing");
    const { mockJoyStory, mockExcavation } = await import("./prompts");
    const { appStoryProblems, leaksAppStoryInstruction } = await import("./app-story");
    const { appExcavateUserText, appReflectUserText, appReflectUserContent } = await import("./weave");
    const joy = JOY_TYPES.find((item) => item.id === "just-this");
    expect(joy).toBeTruthy();
    const excavation = mockExcavation({
      caption: "Blossomimg tree",
      photoNotes: "A blossoming tree against the sky.",
    });
    expect(excavation).toMatch(/SUBJECTS & VIBE/);
    expect(excavation).toMatch(/No people/);
    expect(excavation).toMatch(/petal|bark|blossom/i);
    expect(excavation).toMatch(/CAPTION WHISPER/);
    expect(excavation).toMatch(/Blossomimg tree/);
    expect(excavation).not.toMatch(/once upon|you look|bedtime story/i);
    const story = mockJoyStory({
      joy: joy!,
      caption: "Blossomimg tree",
      goodMoment: "A blossoming tree against the sky.",
      day: "2026-09-21",
      excavation,
    });
    expect(story.body).toMatch(/blossom|petal|bark|tree|sky/i);
    expect(story.body).toMatch(
      /^(Oooh you|Today\b|Wow you|How awesome is this, you|Brilliant\b|Look at you)/,
    );
    expect(story.body).toMatch(/\b(Fantastic|Wonderful|Perfect|Beautiful|Yes), you\b/);
    expect(story.body).toMatch(
      /hunted one good moment today|found one good moment today|becoming someone who looks/,
    );
    expect(story.body).toMatch(/Blossomimg tree/);
    expect(story.body.match(/Blossomimg tree/g)?.length).toBe(1);
    expect(leaksAppStoryInstruction(story.body)).toBe(false);
    expect(appStoryProblems(story.body, joy!.playbackTemplate)).not.toContain("leak");
    expect(story.body).not.toMatch(/nothing else is added/i);
    expect(story.body).not.toMatch(/never more than those words/i);
    expect(story.body).not.toMatch(/not a lecture/i);
    expect(story.body).not.toMatch(/you kept what the frame/i);
    expect(story.body).not.toMatch(/beside the image sits/i);

    const leaked =
      "You kept what the frame actually holds — Blossomimg tree — and nothing else is added to the picture. Beside the image sits only the whisper you wrote — Blossomimg tree — and never more than those words. Just this is only a colour at the edge of this hour, warm and quiet, not a lecture and not a list. You look at that specific thing a little longer, lovely and particular, and you do not have to add anyone who was not there.";
    expect(leaksAppStoryInstruction(leaked)).toBe(true);
    expect(appStoryProblems(leaked, joy!.playbackTemplate)).toContain("leak");

    const excavateUser = appExcavateUserText({
      photoNotes: "A blossoming tree against the sky.",
      caption: "Blossomimg tree",
      hasImage: true,
    });
    expect(excavateUser).toMatch(/No story/);
    expect(excavateUser).toMatch(/ingredients only/);
    expect(excavateUser).not.toMatch(/Write 4–6 short sentences/);

    const user = appReflectUserText({
      joyTitle: joy!.title,
      excavation,
      caption: "Blossomimg tree",
    });
    expect(user).toMatch(/Joy picked: Just this/);
    expect(user).toMatch(/Photo: description/);
    expect(user).toMatch(/Their answer: Blossomimg tree/);
    expect(user).toMatch(/SUBJECTS & VIBE/);
    expect(user).not.toMatch(/~35 words/);
    expect(user).not.toMatch(/four beats/i);
    expect(user).not.toMatch(/4–6 short sentences/);
    expect(user).not.toMatch(/600–900 characters/);
    expect(user).not.toMatch(/Joy playback string/);
    expect(user).not.toMatch(/never more than these words/);
    expect(user).not.toMatch(/colour only, not a lecture/);
    expect(user).not.toMatch(/Forbidden in the story/);

    const withPhoto = appReflectUserContent({
      joyTitle: joy!.title,
      excavation,
      caption: "Blossomimg tree",
      imageDataUrl: "data:image/jpeg;base64,abc",
    });
    expect(Array.isArray(withPhoto)).toBe(true);
    expect(withPhoto).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: "text", text: expect.stringMatching(/Photo: attached/) }),
        expect.objectContaining({
          type: "image_url",
          image_url: { url: "data:image/jpeg;base64,abc" },
        }),
      ]),
    );
    expect(
      appReflectUserContent({
        joyTitle: joy!.title,
        excavation,
        caption: "Blossomimg tree",
      }),
    ).toEqual(expect.stringMatching(/Photo: description/));
  });

  it("weaves an app photo from the joy template without pasting the canned playback", async () => {
    const { APP_STORY_MIN, APP_STORY_MAX } = await import("./app-story");
    const story = await weaveStory({
      vaultId: "v_test",
      day: "2026-09-21",
      lastNight: null,
      captures: [
        {
          id: "cap_app",
          vaultId: "v_test",
          kind: "photo",
          createdAt: "2026-09-21T10:00:00.000Z",
          day: "2026-09-21",
          caption: "gold on the table",
          joyType: "morning-sunlight",
          source: "app",
          goodMoment: "Sun on the kitchen table.",
          ingestStatus: "mock",
        },
      ],
    });
    expect(story.body).not.toMatch(/Ten quiet minutes\. Gold on your skin/);
    expect(story.body).not.toMatch(/breathtakingly, beautifully/);
    expect(story.body).toMatch(/kitchen table|gold on the table/i);
    expect(story.body).not.toMatch(/nothing else|never more|not a lecture|beside the image sits/i);
    expect(story.title).toBe("");
    expect(story.body.length).toBeGreaterThanOrEqual(APP_STORY_MIN);
    expect(story.body.length).toBeLessThanOrEqual(APP_STORY_MAX);
    expect(story.mock).toBe(true);
    expect(story.excavateModel).toBe("mock-excavation");
  });

  it("blocks a horrific app weave and does not produce a story", async () => {
    const { WeaveBlockedError } = await import("./weave");
    await expect(
      weaveStory({
        vaultId: "v_test",
        day: "2026-09-21",
        lastNight: null,
        captures: [
          {
            id: "cap_block",
            vaultId: "v_test",
            kind: "photo",
            createdAt: "2026-09-21T10:00:00.000Z",
            day: "2026-09-21",
            caption: "kill myself",
            joyType: "just-this",
            source: "app",
            goodMoment: "gore on the floor",
            ingestStatus: "mock",
          },
        ],
      }),
    ).rejects.toBeInstanceOf(WeaveBlockedError);
  });
});

describe("landing", () => {
  const page = readFileSync(path.resolve("src/app/page.tsx"), "utf8");
  const copy = readFileSync(path.resolve("src/lib/landing.ts"), "utf8");
  const accordion = readFileSync(path.resolve("src/components/MomentAccordion.tsx"), "utf8");
  const picker = readFileSync(path.resolve("src/components/JoyPicker.tsx"), "utf8");
  const playback = readFileSync(path.resolve("src/components/StoryPlayback.tsx"), "utf8");
  const styles = readFileSync(path.resolve("src/app/globals.css"), "utf8");

  it("has a lime CTA into the joy page and no email form", () => {
    expect(page).toMatch(/href="\/app\/joy"/);
    expect(copy).toMatch(/Hear your story — free/);
    expect(page).not.toMatch(/type="email"/);
    expect(accordion).not.toMatch(/type="email"/);
    expect(picker).not.toMatch(/type="email"/);
    expect(page).not.toMatch(/Signup/);
    expect(page).not.toMatch(/you@email.com/);
  });

  it("keeps verbatim hero, joy types, and footer copy", () => {
    expect(copy).toContain(
      "You scrolled past a hundred good moments today. None of them were yours.",
    );
    expect(page).toContain(
      "You scrolled past a hundred good moments today. None of them were yours.",
    );
    expect(copy).toContain(
      "Your laugh. Your small win. Your quiet moment. Nobody turned them into anything — not even you. Gooddaynight does →",
    );
    expect(page).toContain('<Link href="/app/joy" aria-label="Open the joy page">');
    expect(page).toContain('aria-label="Next step"');
    expect(page).toContain('href="/app/joy"');
    expect(page).toContain("→");
    expect(page).not.toContain("habit of looking");
    expect(copy).not.toContain("habit of looking");
    expect(copy).toContain("One good moment today");
    expect(copy).toContain("Lay the picture here.");
    expect(copy).toContain('joyLegend: "(pick one)"');
    expect(copy).toContain('joyQuestion: "What kind of quiet joy was it?"');
    expect(copy).toContain('joyPickHint: "(pick one)"');
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
      "A sound you stopped for",
      "Someone else's good moment",
      "No name for it",
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
    expect(accordion).toMatch(/<JoyPicker/);
    expect(picker).toMatch(/type="radio"/);
    expect(picker).toMatch(/name = "quiet-joy"/);
    expect(picker).toMatch(/joy__tagline/);
    expect(picker).toMatch(/Capture it/);
    expect(picker).toMatch(/<StoryPlayback/);
    expect(playback).toMatch(/Story playback/);
    expect(playback).toMatch(/className="playback"/);
    expect(styles).toMatch(/#f0f0ff/);
    expect(styles).toMatch(/--docs-lavender/);
  });
});

describe("app capture client contract", () => {
  it("opens joy before the photo page and witnesses after the still is ready", () => {
    const src = readFileSync(path.resolve("src/components/CaptureStudio.tsx"), "utf8");
    const joy = readFileSync(path.resolve("src/components/JoyStudio.tsx"), "utf8");
    const joyPage = readFileSync(path.resolve("src/app/app/joy/page.tsx"), "utf8");
    const yours = readFileSync(path.resolve("src/components/YoursStory.tsx"), "utf8");
    const picker = readFileSync(path.resolve("src/components/JoyPicker.tsx"), "utf8");
    const route = readFileSync(path.resolve("src/app/api/joy-match/route.ts"), "utf8");
    expect(src).toMatch(/LANDING\.app\.heading/);
    expect(src).not.toMatch(/LANDING\.moment\.title/);
    expect(src).not.toMatch(/LANDING\.app\.tagline/);
    expect(src).not.toMatch(/LANDING\.app\.yoursHint/);
    expect(src).not.toMatch(/app-tagline|app-yours-hint/);
    expect(src).toMatch(/LANDING\.app\.photoHelp/);
    expect(src).toMatch(/LANDING\.app\.yours/);
    expect(src).toMatch(/id="yours-door"/);
    expect(src).toMatch(/href="\/app\/yours"/);
    expect(src).toMatch(/aria-label="Previous step"/);
    expect(src).toMatch(/href="\/app\/joy"/);
    expect(src).toMatch(/aria-label="Next step"/);
    expect(src).toMatch(/yoursReady \?/);
    expect(src).toMatch(/writePendingPhoto/);
    expect(src).toMatch(/readChosenJoy/);
    expect(src).toMatch(/\/api\/joy-match/);
    expect(src).not.toMatch(/JoyPicker/);
    expect(src).not.toMatch(/joy-pill/);
    expect(src).not.toMatch(/What kind of quiet joy was it\?/);
    expect(src).not.toMatch(/id="joy-pick"/);
    expect(src).not.toMatch(/className="pill">Joy/);
    expect(joyPage).toMatch(/JoyStudio/);
    expect(joy).toMatch(/writeChosenJoy/);
    expect(joy).not.toMatch(/router\.push/);
    expect(joy).toMatch(/href="\/"/);
    expect(joy).toMatch(/aria-label="Previous step"/);
    expect(joy).toMatch(/href="\/app"/);
    expect(joy).toMatch(/aria-label="Next step"/);
    expect(joy).toMatch(/photo-cue/);
    expect(joy).toMatch(/card__mark/);
    expect(joy).toMatch(/step-arrow--disabled/);
    expect(joy).toMatch(/LANDING\.app\.joyNeed/);
    expect(joy).toMatch(/selectedJoy \?/);
    expect(joy).not.toMatch(/\/api\/joy-match/);
    expect(joy).not.toMatch(/captionDisposition/);
    expect(src).toMatch(/source", "app"/);
    expect(src).toMatch(/joyType/);
    expect(src).toMatch(/tzOffset/);
    expect(src).toMatch(/WHISPER_MAX/);
    expect(src).toMatch(/stillFromVideo/);
    expect(src).toMatch(/LANDING\.app\.takePhoto/);
    expect(src).toMatch(/LANDING\.app\.uploadPhoto/);
    expect(src.match(/capture="environment"/g)?.length).toBe(1);
    expect(src).toMatch(/accept="image\/\*"/);
    expect(src).toMatch(/accept="image\/\*,video\/\*"/);
    expect(src).toMatch(/takeInputRef/);
    expect(src).toMatch(/uploadInputId/);
    expect(src).toMatch(/getUserMedia|openRearCamera|prefersLiveCamera/);
    expect(src).toMatch(/createObjectURL/);
    expect(src).toMatch(/preparePhotoForUpload/);
    expect(src).toMatch(/normalizePhotoFile/);
    expect(src).toMatch(/jpegFileForCameraStill/);
    expect(src).toMatch(/isHeicLike/);
    expect(src).toMatch(/HEIC_ASK/);
    expect(src).toMatch(/takePhoto\(file, true\)/);
    expect(src).toMatch(/takePhoto\(event\.target\.files\?\.\[0\] \?\? null, true\)/);
    expect(src).toMatch(/copyAsJpegFile/);
    const prepare = readFileSync(path.resolve("src/lib/prepare-photo.ts"), "utf8");
    expect(prepare).toMatch(/sniffPhotoBytes/);
    expect(prepare).toMatch(/imageOrientation: "from-image"/);
    expect(prepare).toMatch(/readAsDataURL/);
    expect(prepare).toMatch(/PHOTO_UNREADABLE/);
    expect(prepare).toMatch(/PHOTO_UNSUPPORTED/);
    const live = readFileSync(path.resolve("src/lib/live-camera.ts"), "utf8");
    expect(live).toMatch(/toDataURL\("image\/jpeg"/);
    expect(live).toMatch(/type: "image\/jpeg"/);
    expect(src).toMatch(/originalBytes/);
    expect(src).toMatch(/inspectPhotoDate\(\{\s*bytes: originalBytes/);
    expect(src).toMatch(/Try again|tryAgain/);
    expect(src).not.toMatch(/Take or upload a photo/);
    expect(src).not.toMatch(/Choose another photo/);
    expect(src).not.toMatch(/htmlFor=\{takeInputId\}/);
    expect(joy).toMatch(/JoyPicker/);
    expect(joy).toMatch(/quiet-joy-app/);
    expect(joy).toMatch(/LANDING\.app\.joyQuestion/);
    expect(joy).toMatch(/LANDING\.app\.joyPickHint/);
    expect(joy).toMatch(/<em>/);
    expect(picker).toMatch(/accordionJoys/);
    expect(src).not.toMatch(/What kind of quiet joy was it\?/);
    expect(src).not.toMatch(/href="#yours"/);
    expect(src).not.toMatch(/type="email"/);
    expect(src).not.toMatch(/role="tablist"/);
    expect(src).not.toMatch(/Save this voice note/);
    expect(src).not.toMatch(/See the story/);
    expect(src).not.toMatch(/StoryPlayback/);
    expect(src).toMatch(/LANDING\.app\.replace/);
    expect(src).not.toMatch(/LANDING\.app\.locked/);
    expect(src).not.toMatch(/disabled=\{locked\}/);
    expect(src).not.toMatch(/if \(locked\)/);
    expect(src).not.toMatch(/setCaptureError\(LANDING\.app\.locked\)/);
    expect(yours).toMatch(/StoryPlayback/);
    expect(yours).toMatch(/app-story-playback/);
    expect(yours).toMatch(/card--lavender/);
    expect(yours).toMatch(/POST/);
    expect(yours).toMatch(/\/api\/yours/);
    expect(yours).toMatch(/code === "blocked"/);
    expect(yours).toMatch(/LANDING\.app\.blocked/);
    expect(yours).toMatch(/No YOURS story tonight/);
    expect(yours).toMatch(/Written without seeing the photo/);
    expect(yours).toMatch(/add NEBIUS_API_KEY for Kimi/);
    expect(yours).toMatch(/Couldn’t finish tonight’s close/);
    expect(yours).not.toMatch(/closerHint/);
    expect(yours).not.toMatch(/Kimi didn’t finish/);
    expect(yours).toMatch(/keepCardPhotoSrc|composeKeepCardJpeg/);
    expect(yours).toMatch(/LANDING\.app\.playMoment/);
    expect(yours).toMatch(/PlayIcon/);
    expect(yours).not.toMatch(/Replay last night/);
    expect(yours).toMatch(/LANDING\.app\.keep/);
    expect(yours).toMatch(/keepLabel/);
    expect(yours).toMatch(/ShareIcon/);
    expect(yours).toMatch(/shareOrDownloadKeepCard/);
    expect(yours).toMatch(/btn--keep/);
    const session = readFileSync(path.resolve("src/lib/session.ts"), "utf8");
    expect(session).toMatch(/canReplacePhoto: Boolean\(todayPhoto\)/);
    expect(session).not.toMatch(/canReplacePhoto: Boolean\(todayPhoto\) && !opened/);
    const vault = readFileSync(path.resolve("src/lib/vault.ts"), "utf8");
    expect(vault).toMatch(/clearDayLock/);
    expect(vault).toMatch(/matchingStoryForPhoto/);
    expect(vault).not.toMatch(/Today's photo is locked/);
    const captures = readFileSync(path.resolve("src/app/api/captures/route.ts"), "utf8");
    expect(captures).not.toMatch(/Today's photo is locked/);
    expect(captures).toMatch(/appPhotoRejection/);
    expect(captures).toMatch(/inspectImageSafety/);
    expect(captures).toMatch(/SAFETY_REFUSAL/);
    expect(picker).toMatch(/playbackTemplate/);
    expect(picker).toMatch(/playbackExample/);
    expect(src).toMatch(/LANDING\.app\.captionHelp/);
    expect(src).toMatch(/LANDING\.app\.captionLabel/);
    expect(src).toMatch(/LANDING\.app\.captionExamples/);
    expect(src).toMatch(/placeholder=\{LANDING\.app\.captionExamples\}/);
    expect(src).toMatch(/\{caption\.length\}\/\{WHISPER_MAX\}/);
    expect(src).not.toMatch(/captionBeside/);
    expect(src).not.toMatch(/one line, 80 characters/);
    expect(src).not.toMatch(/It sits beside the photo/);
    expect(src).not.toMatch(/Optional caption/);
    expect(src).toMatch(/captionDisposition/);
    expect(src).toMatch(/LANDING\.footer\.somethingGood/);
    expect(src).toMatch(/LANDING\.footer\.lookingForward/);
    expect(src).toMatch(/LANDING\.footer\.hello/);
    expect(src).toMatch(/mailto:/);
    expect(src).not.toMatch(/LANDING\.footer\.site/);
    expect(src).not.toMatch(/LANDING\.app\.privateNote/);
    expect(src).toMatch(/explainClientFetchError/);
    expect(joy).toMatch(/id="joy-pick"/);
    expect(src).toMatch(/card card--peach card--compact/);
    expect(route).toMatch(/joy_type|joyType/);
    const pickerJsx = joy.match(/<JoyPicker[\s\S]*?\/>/)?.[0] ?? "";
    expect(pickerJsx).not.toMatch(/\bcompact\b/);
    expect(pickerJsx).toMatch(/legend=\{JOY_PAGE_LEGEND\}/);
    expect(src).toMatch(/joy_type/);
    expect(src).toMatch(/photoRef/);
    expect(src).toMatch(/verdict === "NEED_PHOTO"/);
    expect(src).toMatch(/verdict === "UNAVAILABLE"/);
    expect(src).toMatch(/LANDING\.app\.witnessQuiet/);
    expect(src).toMatch(/captionScroll/);
    expect(src).toMatch(/id="joy-witness-quiet"/);
    expect(src).toMatch(/id="caption-box"/);
    expect(picker).not.toMatch(/compact\?:/);
    expect(picker).not.toMatch(/joy-pill/);
    expect(picker).toMatch(/joy__title/);
    expect(picker).toMatch(/joy__tagline/);
    expect(picker).toMatch(/Capture it/);
    expect(src).toMatch(/applyJoyMatchChoice/);
    expect(src).toMatch(/suggestJoyId/);
    expect(src).toMatch(/chooseJoyMatch\("switch"\)/);
    expect(src).toMatch(/chooseJoyMatch\("keep"\)/);
    expect(src).toMatch(/LANDING\.app\.switchJoy/);
    expect(src).toMatch(/LANDING\.app\.keepMine/);
    expect(src).toMatch(/verdict === "MISMATCH"/);
    expect(src).toMatch(/id="joy-mismatch"/);
    expect(src).toMatch(/id="joy-need"/);
    expect(src).toMatch(/JOY_NEED/);
    expect(src).toMatch(/PHOTO_DATE_MESSAGES\.old/);
    expect(src).toMatch(/PHOTO_DATE_MESSAGES\.today/);
    expect(src).toMatch(/date\.verified && date\.takenDay && date\.takenDay !== day/);
    expect(src).toMatch(/date\.verified && date\.takenDay === day/);
    expect(src).not.toMatch(/PHOTO_SAVE_RULES/);
    expect(src).not.toMatch(/photo-rules/);
    expect(src).not.toMatch(/Photo-save rules/i);
    expect(src).not.toMatch(/PHOTO_DATE_MESSAGES\.unverified/);
    expect(src).not.toMatch(/PHOTO_DATE_MESSAGES\.missing/);
    expect(src).not.toMatch(/couldn't confirm a camera date/i);
    const photo = readFileSync(path.resolve("src/lib/photo.ts"), "utf8");
    expect(photo).toContain('today: "Wonderful, your photo was taken today."');
    expect(photo).not.toMatch(/couldn't confirm/i);
    const readme = readFileSync(path.resolve("README.md"), "utf8");
    expect(readme).toContain("Only one photo per calendar day (midnight–23:59, phone’s local time).");
    expect(readme).toContain("Not allowed: memes, someone else’s moment passed off as yours.");
    expect(readme).toMatch(/not shown on `\/app`/);
    expect(readme).not.toMatch(/shown on this page/);
    expect(readme).not.toMatch(/Shown on `\/app`/);
    expect(readme).not.toMatch(/today-only still, size, not a meme/);
    expect(src).not.toMatch(/Failed to fetch/);
    expect(src).toMatch(/className="pill">Photo/);
    expect(joy).toMatch(/className="pill">Joy/);
    expect(src).toMatch(/<span className="pill">Story<\/span>\s*<h2 id="today-heading">/);
    expect(src).not.toMatch(/card--mint[\s\S]{0,180}<span className="pill">Story/);
    expect(joy).not.toMatch(/<span className="pill">Story/);
    expect(src).toMatch(/LANDING\.app\.brand/);
    expect(src).not.toMatch(/header-meta/);
    expect(src).not.toMatch(/Token Factory/);
    expect(src).not.toMatch(/Demo mode/);
    expect(src).toMatch(/writeCaptureStash/);
    expect(src).toMatch(/updateCaptureStashPhoto/);
    expect(src).toMatch(/savedOnPhone/);
    expect(yours).toMatch(/buildAppCaptureForm/);
    expect(yours).toMatch(/readCaptureStash/);
    expect(yours).toMatch(/\/api\/captures/);
    expect(yours).toMatch(/keepingMoment/);
    expect(yours).toMatch(/isYoursMissingPayload/);
  });
});

describe("YOURS two-step brief", () => {
  it("excavates with vision then weaves the story, refusing BLOCK without locking", () => {
    const weave = readFileSync(path.resolve("src/lib/weave.ts"), "utf8");
    const yours = readFileSync(path.resolve("src/app/api/yours/route.ts"), "utf8");
    const envExample = readFileSync(path.resolve(".env.example"), "utf8");
    const readme = readFileSync(path.resolve("README.md"), "utf8");
    expect(weave).toMatch(/APP_EXCAVATE_SYSTEM/);
    expect(weave).toMatch(/APP_REFLECT_SYSTEM/);
    expect(weave).not.toMatch(/4–6 short sentences/);
    expect(weave).toMatch(/visionModels/);
    expect(weave).toMatch(/appStoryVisionModels/);
    expect(weave).toMatch(/appStoryTextModels/);
    expect(weave).toMatch(/formatCloserHint/);
    expect(weave).toMatch(/shrinkDataUrlForModels/);
    expect(weave).toMatch(/appReflectUserContent/);
    expect(weave).toMatch(/mockJoyStory/);
    expect(weave).toMatch(/image_url/);
    expect(weave).toMatch(/imageDataUrl/);
    expect(weave).toMatch(/WeaveBlockedError/);
    expect(weave).toMatch(/parseAppWeaveReply/);
    expect(weave).toMatch(/finishAppStory/);
    expect(weave).toMatch(/leaksAppStoryInstruction|appStoryProblems/);
    expect(yours).toMatch(/WeaveBlockedError/);
    expect(yours).toMatch(/code: "blocked"/);
    expect(yours).toMatch(/code: "missing"/);
    expect(yours).toMatch(/imageDataUrl/);
    expect(yours).toMatch(
      /if \(error instanceof WeaveBlockedError\) \{\s*return forbidden\(error\.message, \{ code: "blocked" \}\)/,
    );
    expect(envExample).toMatch(/NEBIUS_VISION_MODEL/);
    expect(envExample).toMatch(/NEBIUS_STORY_MODEL/);
    expect(envExample).toMatch(/moonshotai\/Kimi-K2\.6/);
    expect(envExample).toMatch(/Nightly Reflection/);
    expect(envExample).toMatch(/image2text/);
    expect(envExample).toMatch(/NEBIUS_STORY_TEXT_MODEL/);
    expect(readme).toMatch(/NEBIUS_VISION_MODEL/);
    expect(readme).toMatch(/NEBIUS_STORY_MODEL/);
    expect(readme).toMatch(/openbmb\/MiniCPM-V-4_5/);
    expect(readme).toMatch(/moonshotai\/Kimi-K2\.6/);
    expect(readme).toMatch(/image2text/);
    expect(readme).toMatch(/attaches the photo|the still is attached|sends the photo/i);
    expect(readme).not.toMatch(/YOURS bedtime story \| `Qwen\/Qwen3-235B-A22B-Instruct-2507`/);
    expect(uniqueModels("a", "a", "", "b")).toEqual(["a", "b"]);
    expect(visionModels()[0]).toBe(MODELS.vision);
    expect(isImage2TextCloser("moonshotai/Kimi-K2.6")).toBe(true);
    expect(isImage2TextCloser("moonshotai/Kimi-K3")).toBe(true);
    expect(isImage2TextCloser("moonshotai/Kimi-K2.7-Code")).toBe(false);
    expect(isImage2TextCloser("Qwen/Qwen3-235B-A22B-Instruct-2507")).toBe(false);
    expect(appStoryVisionModels()).toEqual(["moonshotai/Kimi-K2.6"]);
    expect(appStoryTextModels()[0]).toBe(MODELS.storyText);
    expect(appStoryTextModels()).toContain(MODELS.super);
    expect(appStoryModels()[0]).toBe(MODELS.story);
    expect(appStoryModels()[1]).toBe(MODELS.storyText);
    expect(appStoryModels()[2]).toBe(MODELS.super);
    expect(MODELS.vision).toBe("openbmb/MiniCPM-V-4_5");
    expect(MODELS.story).toBe("moonshotai/Kimi-K2.6");
    expect(MODELS.storyText).toBe("Qwen/Qwen3-235B-A22B-Instruct-2507");
    expect(MODELS.excavateText).toBe("Qwen/Qwen3-235B-A22B-Instruct-2507");
    const health = readFileSync(path.resolve("src/app/api/health/route.ts"), "utf8");
    expect(health).toMatch(/storyText: MODELS\.storyText/);
    expect(health).toMatch(/excavateText: MODELS\.excavateText/);
    expect(health).toMatch(/closerChain: appStoryModels\(\)/);
    expect(readme).toMatch(/empty string ≠ unset|delete empty model env/i);
  });
});
