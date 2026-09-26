import { mkdtempSync, rmSync } from "node:fs";
import { readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  isSavedMomentExpired,
  keptSavedMoments,
  localTodayForClient,
  msUntilLocalMidnight,
  readTzOffset,
  SAVED_MOMENT_EXPIRES_NOTE,
  shareMomentButtonLabel,
} from "./moment-expiry";
import type { CaptureRecord, StoryRecord } from "./types";

const JOHANNESBURG = -120;

describe("saved moments expire at local 23:59", () => {
  it("keeps a moment through 23:59 and drops it at local midnight", () => {
    const saved = "2026-09-26";
    const at2358 = new Date("2026-09-26T21:58:00.000Z");
    const at2359 = new Date("2026-09-26T21:59:00.000Z");
    const lastMs = new Date("2026-09-26T21:59:59.999Z");
    const midnight = new Date("2026-09-26T22:00:00.000Z");

    expect(localTodayForClient({ tzOffset: JOHANNESBURG, now: at2358 })).toBe(saved);
    expect(localTodayForClient({ tzOffset: JOHANNESBURG, now: at2359 })).toBe(saved);
    expect(localTodayForClient({ tzOffset: JOHANNESBURG, now: lastMs })).toBe(saved);
    expect(isSavedMomentExpired(saved, localTodayForClient({ tzOffset: JOHANNESBURG, now: at2358 }))).toBe(false);
    expect(isSavedMomentExpired(saved, localTodayForClient({ tzOffset: JOHANNESBURG, now: at2359 }))).toBe(false);
    expect(isSavedMomentExpired(saved, localTodayForClient({ tzOffset: JOHANNESBURG, now: lastMs }))).toBe(false);
    expect(localTodayForClient({ tzOffset: JOHANNESBURG, now: midnight })).toBe("2026-09-27");
    expect(isSavedMomentExpired(saved, localTodayForClient({ tzOffset: JOHANNESBURG, now: midnight }))).toBe(true);
  });

  it("uses the offset even when the client day string is still yesterday", () => {
    const midnight = new Date("2026-09-26T22:00:00.000Z");
    expect(
      localTodayForClient({ day: "2026-09-26", tzOffset: JOHANNESBURG, now: midnight }),
    ).toBe("2026-09-27");
    expect(localTodayForClient({ day: "2026-09-26", tzOffset: null, now: midnight })).toBe("2026-09-26");
  });

  it("keeps a west-coast moment through 23:59 local and drops it at midnight", () => {
    const pacific = 420;
    const at2359 = new Date("2026-09-27T06:59:59.999Z");
    const midnight = new Date("2026-09-27T07:00:00.000Z");
    expect(isSavedMomentExpired("2026-09-26", localTodayForClient({ tzOffset: pacific, now: at2359 }))).toBe(false);
    expect(isSavedMomentExpired("2026-09-26", localTodayForClient({ tzOffset: pacific, now: midnight }))).toBe(true);
  });

  it("reads offsets and ignores a missing one", () => {
    expect(readTzOffset(null)).toBeNull();
    expect(readTzOffset("")).toBeNull();
    expect(readTzOffset("-120")).toBe(-120);
    expect(readTzOffset("9000")).toBeNull();
  });

  it("hides only days before today", () => {
    const items = [
      { id: "yesterday", day: "2026-09-25" },
      { id: "today", day: "2026-09-26" },
    ];
    expect(keptSavedMoments(items, "2026-09-26").map((item) => item.id)).toEqual(["today"]);
    expect(keptSavedMoments(items, "2026-09-25").map((item) => item.id)).toEqual(["yesterday", "today"]);
  });

  it("measures the wait until local midnight, including the last minute", () => {
    expect(msUntilLocalMidnight(new Date(2026, 8, 26, 23, 58, 0, 0))).toBe(120_000);
    expect(msUntilLocalMidnight(new Date(2026, 8, 26, 23, 59, 0, 0))).toBe(60_000);
    expect(msUntilLocalMidnight(new Date(2026, 8, 26, 23, 59, 59, 0))).toBe(1_000);
    expect(msUntilLocalMidnight(new Date(2026, 8, 27, 0, 0, 0, 0))).toBe(24 * 60 * 60 * 1000);
  });

  it("labels Share with the local expiry line", () => {
    expect(SAVED_MOMENT_EXPIRES_NOTE).toBe("disappears tonight 23:59");
    expect(shareMomentButtonLabel("Share")).toBe("Share · disappears tonight 23:59");
  });
});

describe("purge expired saved moments from the vault", () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(path.join(os.tmpdir(), "gdn-expire-"));
    process.env.DATA_DIR = dir;
    process.env.NEBIUS_S3_BUCKET = "";
    process.env.NEBIUS_S3_ACCESS_KEY_ID = "";
    process.env.NEBIUS_S3_SECRET_ACCESS_KEY = "";
    process.env.NEBIUS_S3_ENDPOINT = "";
    delete process.env.BLOB_READ_WRITE_TOKEN;
    delete process.env.BLOB_STORE_ID;
    delete process.env.VERCEL;
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("deletes yesterday's story, photo, and audio, and keeps today's", async () => {
    const { getOrCreateAnonVault, loadVault, purgeExpiredSavedMoments } = await import("./vault");
    const { putBytes } = await import("./storage");
    const vault = await getOrCreateAnonVault("session-expire");
    const yesterdayPhoto = "mom_yesterday";
    const todayPhoto = "mom_today";
    const yesterdayAudio = `vaults/${vault.id}/stories/yesterday.mp3`;
    const todayAudio = `vaults/${vault.id}/stories/today.mp3`;
    const yesterdayMedia = `vaults/${vault.id}/media/${yesterdayPhoto}.jpg`;
    const todayMedia = `vaults/${vault.id}/media/${todayPhoto}.jpg`;

    vault.stories.push(
      story(vault.id, "st_old", "2026-09-25", "2026-09-25T21:19:00.000Z", yesterdayPhoto, yesterdayAudio),
      story(vault.id, "st_new", "2026-09-26", "2026-09-26T08:01:00.000Z", todayPhoto, todayAudio),
    );
    vault.captures.push(
      capture(vault.id, yesterdayPhoto, "2026-09-25", yesterdayMedia),
      capture(vault.id, todayPhoto, "2026-09-26", todayMedia),
    );
    vault.captureIds = vault.captures.map((item) => item.id);
    vault.yoursOpened = { "2026-09-25": "2026-09-25T22:00:00.000Z", "2026-09-26": "2026-09-26T09:00:00.000Z" };
    await putBytes(yesterdayAudio, Buffer.from("old-audio"), "audio/mpeg");
    await putBytes(todayAudio, Buffer.from("new-audio"), "audio/mpeg");
    await putBytes(yesterdayMedia, Buffer.from("old-photo"), "image/jpeg");
    await putBytes(todayMedia, Buffer.from("new-photo"), "image/jpeg");

    await purgeExpiredSavedMoments(vault, "2026-09-26");

    const saved = await loadVault(vault.id);
    expect(saved?.stories.map((item) => item.id)).toEqual(["st_new"]);
    expect(saved?.captures.map((item) => item.id)).toEqual([todayPhoto]);
    expect(saved?.yoursOpened).toEqual({ "2026-09-26": "2026-09-26T09:00:00.000Z" });
    await expect(readFile(path.join(dir, yesterdayAudio))).rejects.toThrow();
    await expect(readFile(path.join(dir, yesterdayMedia))).rejects.toThrow();
    expect(await readFile(path.join(dir, todayAudio), "utf8")).toBe("new-audio");
    expect(await readFile(path.join(dir, todayMedia), "utf8")).toBe("new-photo");

    await purgeExpiredSavedMoments(vault, "2026-09-26");
    expect((await loadVault(vault.id))?.stories).toHaveLength(1);
  });

  it("is what the result screen, joy list, and moments page use to clean storage", async () => {
    const { readFileSync } = await import("node:fs");
    const yours = readFileSync(path.resolve("src/app/api/yours/route.ts"), "utf8");
    const session = readFileSync(path.resolve("src/app/api/session/route.ts"), "utf8");
    const captures = readFileSync(path.resolve("src/app/api/captures/route.ts"), "utf8");
    const moments = readFileSync(path.resolve("src/app/moments/page.tsx"), "utf8");
    const story = readFileSync(path.resolve("src/components/YoursStory.tsx"), "utf8");
    const joy = readFileSync(path.resolve("src/components/JoyStudio.tsx"), "utf8");
    const styles = readFileSync(path.resolve("src/app/globals.css"), "utf8");

    expect(yours).toMatch(/purgeExpiredSavedMoments/);
    expect(yours).not.toMatch(/vault\.stories\s*=/);
    expect(session).toMatch(/purgeExpiredSavedMoments/);
    expect(captures).toMatch(/purgeExpiredSavedMoments/);
    expect(moments).toMatch(/ExpireSavedMoments/);
    expect(moments).not.toContain("My saved joy moments");
    expect(story).toMatch(/keptSavedMoments/);
    expect(story).toMatch(/share-pin/);
    expect(story).toMatch(/SAVED_MOMENT_EXPIRES_NOTE/);
    expect(story).toMatch(/My saved joy moments/);
    expect(joy).toMatch(/keptSavedMoments/);
    expect(styles).toMatch(/\.btn\.share-pin\s*\{[^}]*position:\s*fixed;/);
    expect(styles).toMatch(/\.btn\.share-pin\s*\{[^}]*z-index:\s*44;/);
    expect(styles).toMatch(
      /\.btn\.share-pin\s*\{[^}]*bottom:\s*calc\(2\.75rem \+ env\(safe-area-inset-bottom\) \+ 0\.5rem \+ 48px \+ 0\.55rem\);/,
    );
    expect(styles).toMatch(/\.btn\.share-pin\s*\{[^}]*right:\s*max\(0\.7rem, env\(safe-area-inset-right\)\);/);
    expect(styles).toMatch(/\.account-menu\s*\{[^}]*z-index:\s*45;/);
    expect(styles).toMatch(/body:has\(\.step-pin\) \.share-pin/);
  });
});

function story(
  vaultId: string,
  id: string,
  day: string,
  createdAt: string,
  captureId: string,
  audioKey: string,
): StoryRecord {
  return {
    id,
    vaultId,
    day,
    title: "",
    body: "I kept the morning light.",
    createdAt,
    weaveModel: "mock",
    tts: { status: "stub", note: "browser", audioKey },
    captureIds: [captureId],
    mock: true,
  };
}

function capture(vaultId: string, id: string, day: string, mediaKey: string): CaptureRecord {
  return {
    id,
    vaultId,
    kind: "photo",
    createdAt: `${day}T08:00:00.000Z`,
    day,
    source: "app",
    mediaKey,
    mediaContentType: "image/jpeg",
    ingestStatus: "mock",
  };
}
