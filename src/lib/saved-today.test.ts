import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { KEEPSAKE_CLOSING_LINES } from "./affirmation";
import { todaySavedMoments, storyLead, savedMomentTimeSast, SAVED_TODAY_EMPTY, SAVED_TODAY_LABEL } from "./saved-today";
import type { CaptureRecord, StoryRecord } from "./types";

const CLOSE = KEEPSAKE_CLOSING_LINES[0];

function story(id: string, day: string, createdAt: string, body: string, captureId: string): StoryRecord {
  return {
    id,
    vaultId: "em_test",
    day,
    title: "",
    body,
    createdAt,
    weaveModel: "mock",
    tts: { status: "stub", note: "browser" },
    captureIds: [captureId],
    mock: true,
  };
}

function photo(id: string, mediaKey?: string): CaptureRecord {
  return {
    id,
    vaultId: "em_test",
    kind: "photo",
    createdAt: "2026-09-27T05:00:00.000Z",
    day: "2026-09-27",
    source: "app",
    mediaKey,
    mediaContentType: mediaKey ? "image/png" : undefined,
    ingestStatus: "ok",
  };
}

describe("today's saved moments", () => {
  it("names the dropdown and the empty line in warm words", () => {
    expect(SAVED_TODAY_LABEL).toBe("My saved moments \u2013 disappears at 23:59 tonight");
    expect(SAVED_TODAY_EMPTY).toBe("No saved moments yet today.");
    expect(SAVED_TODAY_EMPTY).not.toMatch(/gone|expired|error|fail/i);
  });

  it("shows the SAST 24-hour clock", () => {
    expect(savedMomentTimeSast("2026-09-27T05:12:00.000Z")).toBe("07:12");
    expect(savedMomentTimeSast("2026-09-27T16:41:00.000Z")).toBe("18:41");
    expect(savedMomentTimeSast("2026-09-27T22:05:00.000Z")).toBe("00:05");
  });

  it("keeps the first words of the story and leaves the closing line off the list", () => {
    const body = `I stepped into the early gold and let the morning find me on the path.\n\n${CLOSE}`;
    expect(storyLead(body)).toBe("I stepped into the early gold and let the morning find me\u2026");
    expect(storyLead(body)).not.toContain("beautiful");
    expect(storyLead("I kept the laugh.")).toBe("I kept the laugh.");
  });

  it("lists every moment saved today and drops the ones that expired at midnight", () => {
    const stories = [
      story("early", "2026-09-27", "2026-09-27T05:12:00.000Z", "I stepped into the early gold and let the day find me.", "cap_early"),
      story("late", "2026-09-27", "2026-09-27T16:41:00.000Z", "I kept the laugh that found me on the walk home.", "cap_late"),
      story("yesterday", "2026-09-26", "2026-09-26T18:00:00.000Z", "I kept yesterday.", "cap_old"),
      story("words", "2026-09-27", "2026-09-27T08:00:00.000Z", "I wrote the good down.", "cap_words"),
    ];
    for (let n = 0; n < 7; n += 1) {
      stories.push(
        story(`extra_${n}`, "2026-09-27", `2026-09-27T09:0${n}:00.000Z`, `I kept extra moment ${n}.`, `cap_extra_${n}`),
      );
    }
    const listed = todaySavedMoments(
      stories,
      [photo("cap_early", "vaults/em_test/media/early.png"), photo("cap_late", "vaults/em_test/media/late.png"), photo("cap_words")],
      "2026-09-27",
    );
    expect(listed.some((item) => item.id === "yesterday")).toBe(false);
    expect(listed).toHaveLength(10);
    expect(listed[0]?.id).toBe("late");
    expect(listed[0]).toMatchObject({
      time: "18:41",
      captureId: "cap_late",
      excerpt: "I kept the laugh that found me on the walk home.",
    });
    expect(listed.find((item) => item.id === "early")?.captureId).toBe("cap_early");
    expect(listed.find((item) => item.id === "words")?.captureId).toBeNull();
  });

  it("is what the capture page dropdown and the yours list route use", () => {
    const capture = readFileSync(path.resolve("src/components/CaptureStudio.tsx"), "utf8");
    const dropdown = readFileSync(path.resolve("src/components/SavedMomentsToday.tsx"), "utf8");
    const route = readFileSync(path.resolve("src/app/api/yours/route.ts"), "utf8");
    const story = readFileSync(path.resolve("src/components/YoursStory.tsx"), "utf8");
    const styles = readFileSync(path.resolve("src/app/globals.css"), "utf8");

    expect(capture.indexOf("<NoticingMoments />")).toBeLessThan(capture.indexOf("<SavedMomentsToday />"));
    expect(dropdown).toContain("SAVED_TODAY_LABEL");
    expect(dropdown).toContain("SAVED_TODAY_EMPTY");
    expect(dropdown).toContain('className="noticing__bar pastel-banner"');
    expect(dropdown).toContain('className="noticing__chevron"');
    expect(dropdown).toContain("/app/yours?story=");
    expect(dropdown).toContain('list=today');
    expect(dropdown).not.toMatch(/share-pin|navigator\.share/);
    expect(route).toMatch(/get\("list"\) === "today"/);
    expect(route).toMatch(/todaySavedMoments\(listStories\(vault\), vault\.captures, today\)/);
    expect(route).toMatch(/latestMoments\(stories, \{ excludeId: currentId \}\)/);
    expect(route).toMatch(/purgeExpiredSavedMoments/);
    expect(story).toMatch(/share-pin/);
    expect(styles).toMatch(/\.noticing__label\s*\{[^}]*overflow-wrap:\s*break-word/);
    expect(styles).toMatch(/\.noticing__panel--saved\s*\{[^}]*overflow:\s*auto/);
    expect(styles).not.toMatch(/\.saved-today__link\s*\{[^}]*position:\s*fixed/);
  });
});
