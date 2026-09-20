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
});
