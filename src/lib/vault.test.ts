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

  it("keeps several app photos in one day and updates one moment without deleting the other", async () => {
    const {
      addStory,
      getOrCreateAnonVault,
      saveAppMoment,
      markMomentOpened,
      appPhotosForDay,
      storyForCapture,
      listStories,
    } = await import("./vault");
    const vault = await getOrCreateAnonVault("session-app-photo");
    const base = {
      kind: "photo" as const,
      day: "2026-09-21",
      joyType: "just-this",
      source: "app" as const,
      ingestStatus: "mock" as const,
    };
    const first = await saveAppMoment(vault, {
      ...base,
      id: "mom_cars000000000001",
      createdAt: "2026-09-21T10:00:00.000Z",
      caption: "cars",
      spark: "A row of cars.",
    });
    const second = await saveAppMoment(vault, {
      ...base,
      id: "mom_screen00000000001",
      createdAt: "2026-09-21T11:00:00.000Z",
      caption: "inbox",
      spark: "A mobile screen displaying an email.",
    });
    expect(second.id).not.toBe(first.id);
    expect(appPhotosForDay(vault, "2026-09-21")).toHaveLength(2);

    await addStory(vault, {
      id: "st_cars",
      day: "2026-09-21",
      title: "",
      body: "the cars stayed",
      createdAt: "2026-09-21T12:00:00.000Z",
      weaveModel: "mock",
      tts: { status: "stub", note: "browser" },
      captureIds: [first.id],
      mock: true,
    });
    await addStory(vault, {
      id: "st_screen",
      day: "2026-09-21",
      title: "",
      body: "the inbox stayed",
      createdAt: "2026-09-21T12:05:00.000Z",
      weaveModel: "mock",
      tts: { status: "stub", note: "browser" },
      captureIds: [second.id],
      mock: true,
    });

    const edited = await saveAppMoment(vault, {
      ...base,
      id: first.id,
      createdAt: "2026-09-21T13:00:00.000Z",
      caption: "cars again",
      spark: "A row of cars in the sun.",
      mediaKey: "vaults/x/media/cars.jpg",
    });
    expect(edited.id).toBe(first.id);
    expect(edited.spark).toBe("A row of cars in the sun.");
    expect(edited.caption).toBe("cars again");
    expect(storyForCapture(vault, first.id)).toBeNull();
    expect(storyForCapture(vault, second.id)?.body).toMatch(/inbox stayed/);
    expect(listStories(vault)).toHaveLength(1);
    await markMomentOpened(vault, second.id);
    expect(appPhotosForDay(vault, "2026-09-21").find((photo) => photo.id === second.id)?.locked).toBe(
      true,
    );
    expect(appPhotosForDay(vault, "2026-09-21").find((photo) => photo.id === first.id)?.caption).toBe(
      "cars again",
    );
  });
});
