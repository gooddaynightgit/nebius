import { mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

describe("private vault", () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(path.join(os.tmpdir(), "gdn-"));
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

  it("stores captures on an anonymous vault, then migrates to an email vault", async () => {
    const { addCapture, attachEmail, getOrCreateAnonVault, newId } = await import("./vault");

    const anon = await getOrCreateAnonVault("session-amy");
    expect(anon.kind).toBe("anon");
    await addCapture(anon, {
      id: newId("cap"),
      kind: "text",
      createdAt: new Date().toISOString(),
      day: "2026-09-20",
      text: "the quiet kitchen light",
      goodMoment: "You noticed the quiet kitchen light.",
      ingestStatus: "mock",
    });

    const emailVault = await attachEmail("session-amy", "amy@email.com");
    expect(emailVault.kind).toBe("email");
    expect(emailVault.email).toBe("amy@email.com");
    expect(emailVault.captures).toHaveLength(1);
    expect(emailVault.captures[0].text).toMatch(/kitchen light/);
    expect(emailVault.id).not.toContain("amy@");
  });

  it("merges client captures into an empty vault so unlock can proceed", async () => {
    const { getOrCreateAnonVault, mergeCapturesIntoVault } = await import("./vault");
    const vault = await getOrCreateAnonVault("session-empty");
    expect(vault.captures).toHaveLength(0);

    const added = mergeCapturesIntoVault(
      vault,
      [
        {
          id: "cap_voice_1",
          kind: "voice",
          createdAt: "2026-09-20T08:00:00.000Z",
          day: "2026-09-20",
          transcript: "the kettle clicked off",
          goodMoment: "You kept the click of the kettle.",
          ingestStatus: "mock",
        },
      ],
      "2026-09-20",
    );

    expect(added).toBe(true);
    expect(vault.captures).toHaveLength(1);
    expect(vault.captures[0].kind).toBe("voice");
    expect(mergeCapturesIntoVault(vault, vault.captures, "2026-09-20")).toBe(false);
  });

  it("replaces today's app photo until YOURS is opened, then locks", async () => {
    const {
      getOrCreateAnonVault,
      upsertAppPhoto,
      markYoursOpened,
      appPhotoForDay,
    } = await import("./vault");
    const vault = await getOrCreateAnonVault("session-app-photo");
    const first = await upsertAppPhoto(vault, {
      id: "cap_a",
      kind: "photo",
      createdAt: "2026-09-21T10:00:00.000Z",
      day: "2026-09-21",
      caption: "first still",
      joyType: "morning-sunlight",
      source: "app",
      ingestStatus: "mock",
    });
    const second = await upsertAppPhoto(vault, {
      id: "cap_b",
      kind: "photo",
      createdAt: "2026-09-21T11:00:00.000Z",
      day: "2026-09-21",
      caption: "second still",
      joyType: "just-this",
      source: "app",
      ingestStatus: "mock",
    });
    expect(second.id).toBe(first.id);
    expect(appPhotoForDay(vault, "2026-09-21")?.caption).toBe("second still");
    await markYoursOpened(vault, "2026-09-21");
    await expect(
      upsertAppPhoto(vault, {
        id: "cap_c",
        kind: "photo",
        createdAt: "2026-09-21T12:00:00.000Z",
        day: "2026-09-21",
        caption: "too late",
        joyType: "just-this",
        source: "app",
        ingestStatus: "mock",
      }),
    ).rejects.toThrow(/locked/i);
  });
});
