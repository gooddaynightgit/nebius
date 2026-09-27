import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { isSavedMomentExpired } from "./moment-expiry";
import type { CaptureRecord, StoryRecord, VaultRecord } from "./types";

const UTC_PLUS_14 = -14 * 60;

describe("earliest local day for the daily sweep", () => {
  it("uses the UTC−12 date, which is still yesterday at 11:59 UTC and today at 12:15 UTC", async () => {
    const { earliestCurrentLocalDay, MOMENT_SWEEP_CRON } = await import("./moment-sweep");
    const beforeLastMidnight = new Date("2026-09-26T11:59:00.000Z");
    const scheduled = new Date("2026-09-26T12:15:00.000Z");

    expect(earliestCurrentLocalDay(beforeLastMidnight)).toBe("2026-09-25");
    expect(earliestCurrentLocalDay(scheduled)).toBe("2026-09-26");
    expect(MOMENT_SWEEP_CRON).toBe("15 12 * * *");

    const cutoff = earliestCurrentLocalDay(scheduled);
    expect(isSavedMomentExpired("2026-09-25", cutoff)).toBe(true);
    expect(isSavedMomentExpired("2026-09-26", cutoff)).toBe(false);
    const { dayFromUnixMsWithOffset } = await import("./day");
    expect(dayFromUnixMsWithOffset(scheduled.getTime(), UTC_PLUS_14)).toBe("2026-09-27");
  });

  it("schedules the Vercel cron at 12:15 UTC", () => {
    const config = JSON.parse(readFileSync(path.resolve("vercel.json"), "utf8")) as {
      crons: Array<{ path: string; schedule: string }>;
    };
    expect(config.crons).toEqual([
      { path: "/api/cron/expire-moments", schedule: "15 12 * * *" },
    ]);
  });
});

describe("sweep expired moments across vaults", () => {
  let dir: string;
  const errors: unknown[][] = [];

  beforeEach(() => {
    dir = mkdtempSync(path.join(os.tmpdir(), "gdn-sweep-"));
    process.env.DATA_DIR = dir;
    process.env.NEBIUS_S3_BUCKET = "";
    process.env.NEBIUS_S3_ACCESS_KEY_ID = "";
    process.env.NEBIUS_S3_SECRET_ACCESS_KEY = "";
    process.env.NEBIUS_S3_ENDPOINT = "";
    delete process.env.BLOB_READ_WRITE_TOKEN;
    delete process.env.BLOB_STORE_ID;
    delete process.env.VERCEL;
    errors.length = 0;
    vi.spyOn(console, "error").mockImplementation((...args: unknown[]) => {
      errors.push(args);
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    rmSync(dir, { recursive: true, force: true });
  });

  it("removes expired moments for every vault and keeps a day that is still today in UTC−12", async () => {
    const { putBytes, putJSON, getJSON } = await import("./storage");
    const { sweepExpiredMoments } = await import("./moment-sweep");
    const when = new Date("2026-09-26T12:15:00.000Z");

    const anon = vault("anon_west", "anon");
    const anonPhoto = `vaults/${anon.id}/media/old.jpg`;
    const anonTodayPhoto = `vaults/${anon.id}/media/today.jpg`;
    const anonAudio = `vaults/${anon.id}/stories/old.mp3`;
    const anonTodayAudio = `vaults/${anon.id}/stories/today.mp3`;
    anon.stories.push(
      story(anon.id, "st_old", "2026-09-25", anonAudio),
      story(anon.id, "st_today", "2026-09-26", anonTodayAudio),
    );
    anon.captures.push(
      capture(anon.id, "cap_old", "2026-09-25", anonPhoto),
      capture(anon.id, "cap_today", "2026-09-26", anonTodayPhoto),
    );
    anon.captureIds = anon.captures.map((item) => item.id);
    anon.yoursOpened = {
      "2026-09-25": "2026-09-25T20:00:00.000Z",
      "2026-09-26": "2026-09-26T08:00:00.000Z",
    };

    const email = vault("em_east", "email");
    const sharedAudio = `vaults/${email.id}/stories/shared.mp3`;
    const emailPhoto = `vaults/${email.id}/media/old.jpg`;
    email.stories.push(
      story(email.id, "st_yesterday", "2026-09-25", sharedAudio),
      story(email.id, "st_still_today_in_utc12", "2026-09-26", sharedAudio),
    );
    email.captures.push(capture(email.id, "cap_email_old", "2026-09-25", emailPhoto));
    email.captureIds = email.captures.map((item) => item.id);

    const orphan = vault("anon_orphan", "anon");
    orphan.stories.push(story(orphan.id, "st_keep", "2026-09-26", `vaults/${orphan.id}/stories/keep.mp3`));

    await putJSON(`vaults/${anon.id}/vault.json`, anon);
    await putJSON(`vaults/${email.id}/vault.json`, email);
    await putJSON(`vaults/${orphan.id}/vault.json`, orphan);
    await putBytes(anonPhoto, Buffer.from("old-photo"), "image/jpeg");
    await putBytes(anonTodayPhoto, Buffer.from("today-photo"), "image/jpeg");
    await putBytes(anonAudio, Buffer.from("old-audio"), "audio/mpeg");
    await putBytes(anonTodayAudio, Buffer.from("today-audio"), "audio/mpeg");
    await putBytes(sharedAudio, Buffer.from("shared-audio"), "audio/mpeg");
    await putBytes(emailPhoto, Buffer.from("email-photo"), "image/jpeg");
    await putBytes(`vaults/${orphan.id}/stories/keep.mp3`, Buffer.from("keep-audio"), "audio/mpeg");
    await putBytes("vaults/zzz-bad/vault.json", Buffer.from("{not-json", "utf8"), "application/json");

    const result = await sweepExpiredMoments({ now: when, budgetMs: 60_000 });

    expect(result).toMatchObject({
      cutoffDay: "2026-09-26",
      vaultsPurged: 2,
      failures: 1,
      done: true,
    });
    expect(result.vaultsSeen).toBeGreaterThanOrEqual(3);

    const savedAnon = await getJSON<VaultRecord>(`vaults/${anon.id}/vault.json`);
    expect(savedAnon?.stories.map((item) => item.id)).toEqual(["st_today"]);
    expect(savedAnon?.captures.map((item) => item.id)).toEqual(["cap_today"]);
    expect(savedAnon?.yoursOpened).toEqual({ "2026-09-26": "2026-09-26T08:00:00.000Z" });
    await expect(readFile(path.join(dir, anonPhoto))).rejects.toThrow();
    await expect(readFile(path.join(dir, anonAudio))).rejects.toThrow();
    expect(await readFile(path.join(dir, anonTodayPhoto), "utf8")).toBe("today-photo");
    expect(await readFile(path.join(dir, anonTodayAudio), "utf8")).toBe("today-audio");

    const savedEmail = await getJSON<VaultRecord>(`vaults/${email.id}/vault.json`);
    expect(savedEmail?.stories.map((item) => item.id)).toEqual(["st_still_today_in_utc12"]);
    expect(savedEmail?.captures).toEqual([]);
    await expect(readFile(path.join(dir, emailPhoto))).rejects.toThrow();
    expect(await readFile(path.join(dir, sharedAudio), "utf8")).toBe("shared-audio");

    const savedOrphan = await getJSON<VaultRecord>(`vaults/${orphan.id}/vault.json`);
    expect(savedOrphan?.stories.map((item) => item.id)).toEqual(["st_keep"]);
    expect(await readFile(path.join(dir, `vaults/${orphan.id}/stories/keep.mp3`), "utf8")).toBe("keep-audio");
    expect(errors.some((line) => String(line[0]).includes("vaults/zzz-bad/vault.json"))).toBe(true);
  });

  it("keeps a UTC−12 today when the sweep runs before that zone's midnight", async () => {
    const { putJSON, getJSON } = await import("./storage");
    const { sweepExpiredMoments } = await import("./moment-sweep");
    const early = new Date("2026-09-26T11:59:00.000Z");
    const west = vault("anon_baker", "anon");
    west.stories.push(story(west.id, "st_baker", "2026-09-25", `vaults/${west.id}/stories/baker.mp3`));
    await putJSON(`vaults/${west.id}/vault.json`, west);

    const result = await sweepExpiredMoments({ now: early, budgetMs: 60_000 });

    expect(result.cutoffDay).toBe("2026-09-25");
    expect(result.vaultsPurged).toBe(0);
    const saved = await getJSON<VaultRecord>(`vaults/${west.id}/vault.json`);
    expect(saved?.stories.map((item) => item.id)).toEqual(["st_baker"]);
  });

  it("resumes across pages and vault caps until every expired moment is gone", async () => {
    const { putJSON, getJSON } = await import("./storage");
    const { listKeys } = await import("./storage");
    const { sweepExpiredMoments } = await import("./moment-sweep");
    const when = new Date("2026-09-26T12:15:00.000Z");
    for (const id of ["a-old", "b-old", "c-today"]) {
      const record = vault(id, id === "b-old" ? "email" : "anon");
      const day = id === "c-today" ? "2026-09-26" : "2026-09-25";
      record.stories.push(story(record.id, `st_${id}`, day, `vaults/${id}/stories/${day}.mp3`));
      await putJSON(`vaults/${id}/vault.json`, record);
    }

    const firstPage = await listKeys({ prefix: "vaults/", limit: 1 });
    expect(firstPage.keys).toEqual(["vaults/a-old/vault.json"]);
    expect(firstPage.cursor).toBe("vaults/a-old/vault.json");

    const first = await sweepExpiredMoments({ now: when, budgetMs: 60_000, pageSize: 1, maxVaults: 1 });
    expect(first.done).toBe(false);
    expect(first.vaultsPurged).toBe(1);
    expect((await getJSON<VaultRecord>("vaults/a-old/vault.json"))?.stories).toEqual([]);
    expect((await getJSON<VaultRecord>("vaults/b-old/vault.json"))?.stories).toHaveLength(1);
    expect((await getJSON<VaultRecord>("vaults/c-today/vault.json"))?.stories).toHaveLength(1);

    const progress = await getJSON<{ pageCursor?: string; afterKey?: string }>("index/moment-sweep.json");
    expect(progress?.pageCursor || progress?.afterKey).toBeTruthy();

    const second = await sweepExpiredMoments({ now: when, budgetMs: 60_000, pageSize: 1, maxVaults: 1 });
    expect(second.done).toBe(false);
    expect(second.vaultsPurged).toBe(1);
    expect((await getJSON<VaultRecord>("vaults/b-old/vault.json"))?.stories).toEqual([]);
    expect((await getJSON<VaultRecord>("vaults/c-today/vault.json"))?.stories.map((item) => item.id)).toEqual([
      "st_c-today",
    ]);

    const finished = await sweepExpiredMoments({ now: when, budgetMs: 60_000, pageSize: 1 });
    expect(finished.done).toBe(true);
    expect((await getJSON<VaultRecord>("vaults/c-today/vault.json"))?.stories.map((item) => item.id)).toEqual([
      "st_c-today",
    ]);
  });
});

describe("daily sweep route", () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(path.join(os.tmpdir(), "gdn-sweep-route-"));
    process.env.DATA_DIR = dir;
    process.env.NEBIUS_S3_BUCKET = "";
    process.env.NEBIUS_S3_ACCESS_KEY_ID = "";
    process.env.NEBIUS_S3_SECRET_ACCESS_KEY = "";
    process.env.NEBIUS_S3_ENDPOINT = "";
    delete process.env.BLOB_READ_WRITE_TOKEN;
    delete process.env.BLOB_STORE_ID;
    delete process.env.VERCEL;
    delete process.env.CRON_SECRET;
  });

  afterEach(() => {
    delete process.env.CRON_SECRET;
    rmSync(dir, { recursive: true, force: true });
  });

  it("refuses a caller without the cron secret", async () => {
    const { GET } = await import("@/app/api/cron/expire-moments/route");
    const missing = await GET(new Request("http://localhost/api/cron/expire-moments"));
    expect(missing.status).toBe(401);

    process.env.CRON_SECRET = "sweep-secret";
    const wrong = await GET(
      new Request("http://localhost/api/cron/expire-moments", {
        headers: { authorization: "Bearer other-secret" },
      }),
    );
    expect(wrong.status).toBe(401);

    delete process.env.CRON_SECRET;
    const unset = await GET(
      new Request("http://localhost/api/cron/expire-moments", {
        headers: { authorization: "Bearer sweep-secret" },
      }),
    );
    expect(unset.status).toBe(401);
  });

  it("purges expired vaults when the bearer token matches", async () => {
    const { putJSON, getJSON } = await import("./storage");
    const { earliestCurrentLocalDay } = await import("./moment-sweep");
    const { GET } = await import("@/app/api/cron/expire-moments/route");
    const cutoff = earliestCurrentLocalDay();
    const older = shiftDay(cutoff, -1);
    const record = vault("anon_route", "anon");
    record.stories.push(
      story(record.id, "st_old", older, `vaults/${record.id}/stories/old.mp3`),
      story(record.id, "st_today", cutoff, `vaults/${record.id}/stories/today.mp3`),
    );
    await putJSON(`vaults/${record.id}/vault.json`, record);
    process.env.CRON_SECRET = "sweep-secret";

    const res = await GET(
      new Request("http://localhost/api/cron/expire-moments", {
        headers: { authorization: "Bearer sweep-secret" },
      }),
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { cutoffDay: string; vaultsPurged: number; done: boolean };
    expect(body.cutoffDay).toBe(cutoff);
    expect(body.vaultsPurged).toBe(1);
    expect(body.done).toBe(true);
    const saved = await getJSON<VaultRecord>(`vaults/${record.id}/vault.json`);
    expect(saved?.stories.map((item) => item.id)).toEqual(["st_today"]);
  });
});

function shiftDay(day: string, delta: number): string {
  const [year, month, date] = day.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, date + delta)).toISOString().slice(0, 10);
}

function vault(id: string, kind: VaultRecord["kind"]): VaultRecord {
  return {
    id,
    kind,
    sessionId: `session-${id}`,
    email: kind === "email" ? `${id}@example.com` : undefined,
    createdAt: "2026-09-25T00:00:00.000Z",
    updatedAt: "2026-09-25T00:00:00.000Z",
    captureIds: [],
    stories: [],
    captures: [],
  };
}

function story(vaultId: string, id: string, day: string, audioKey: string): StoryRecord {
  return {
    id,
    vaultId,
    day,
    title: "",
    body: "I kept the morning light.",
    createdAt: `${day}T08:00:00.000Z`,
    weaveModel: "mock",
    tts: { status: "stub", note: "browser", audioKey },
    captureIds: [],
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
