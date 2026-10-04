import { mkdtempSync, rmSync } from "node:fs";
import { readFile, readdir } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { anonVaultId, emailVaultId } from "./identity";
import { OTP_COOKIE, otpSessionSecret, sealOtpCookie } from "./otp-session";

const jar = vi.hoisted(() => new Map<string, string>());

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get(name: string) {
      const value = jar.get(name);
      return value ? { name, value } : undefined;
    },
    set(name: string, value: string) {
      jar.set(name, value);
    },
  }),
}));

import { POST as checkout } from "@/app/api/payfast/checkout/route";
import { GET as captures } from "@/app/api/captures/route";
import { POST as email } from "@/app/api/email/route";
import { GET as media } from "@/app/api/media/[captureId]/route";
import { GET as sessionGet, POST as sessionPost } from "@/app/api/session/route";
import { GET as storyAudio } from "@/app/api/story/audio/route";
import { GET as story } from "@/app/api/story/route";
import { POST as weave } from "@/app/api/weave/route";
import { GET as yours } from "@/app/api/yours/route";
import { EMAIL_COOKIE, SESSION_COOKIE } from "./session";
import { getJSON } from "./storage";
import type { VaultRecord } from "./types";
import { addCapture, loadVault, readVaultForSession } from "./vault";

describe("lazy vault creation", () => {
  let dir: string;
  const env = { ...process.env };

  beforeEach(() => {
    dir = mkdtempSync(path.join(os.tmpdir(), "gdn-lazy-"));
    process.env.DATA_DIR = dir;
    process.env.NEBIUS_S3_BUCKET = "";
    process.env.NEBIUS_S3_ACCESS_KEY_ID = "";
    process.env.NEBIUS_S3_SECRET_ACCESS_KEY = "";
    process.env.NEBIUS_S3_ENDPOINT = "";
    delete process.env.BLOB_READ_WRITE_TOKEN;
    delete process.env.BLOB_STORE_ID;
    delete process.env.VERCEL;
    jar.clear();
    jar.set(SESSION_COOKIE, "session-lazy");
  });

  afterEach(() => {
    process.env = { ...env };
    jar.clear();
    rmSync(dir, { recursive: true, force: true });
  });

  it("treats a visit, including ExpireSavedMoments, as an empty vault and writes nothing", async () => {
    const first = await sessionGet(new Request("http://localhost/api/session"));
    const body = (await first.json()) as { captureCount: number; vaultId: string; email: string | null };
    expect(first.status).toBe(200);
    expect(body.captureCount).toBe(0);
    expect(body.email).toBeNull();
    expect(body.vaultId).toBe("anon_session-lazy");

    const again = await sessionPost(new Request("http://localhost/api/session", { method: "POST" }));
    expect(again.status).toBe(200);
    expect(await captures(new Request("http://localhost/api/captures"))).toMatchObject({ status: 200 });
    const capturesBody = await (await captures(new Request("http://localhost/api/captures"))).json();
    expect(capturesBody.captures).toEqual([]);
    const storyRes = await story(new Request("http://localhost/api/story"));
    expect(storyRes.status).toBe(200);
    expect((await storyRes.json()).story).toBeNull();
    expect((await storyAudio(new Request("http://localhost/api/story/audio"))).status).toBe(404);
    expect((await weave(jsonRequest("http://localhost/api/weave", {}))).status).toBe(403);
    expect((await email(jsonRequest("http://localhost/api/email", {}))).status).toBe(400);

    expect(await getJSON("index/sessions.json")).toBeNull();
    expect(await getJSON("vaults/anon_session-lazy/vault.json")).toBeNull();
    expect(await readdir(dir).catch(() => [])).toEqual([]);
  });

  it("opens yours, media, and a signed-in session with no vault file", async () => {
    signIn("amy@example.com");
    const day = new Date().toISOString().slice(0, 10);
    const yoursRes = await yours(new Request(`http://localhost/api/yours?day=${day}`));
    expect(yoursRes.status).toBe(404);
    const mediaRes = await media(new Request("http://localhost/api/media/missing"), {
      params: Promise.resolve({ captureId: "missing" }),
    });
    expect(mediaRes.status).toBe(404);
    const sessionRes = await sessionGet(new Request("http://localhost/api/session"));
    const body = (await sessionRes.json()) as { vaultId: string; email: string | null; captureCount: number };
    expect(body.vaultId).toBe(emailVaultId("amy@example.com"));
    expect(body.email).toBe("amy@example.com");
    expect(body.captureCount).toBe(0);
    expect(await getJSON(`vaults/${body.vaultId}/vault.json`)).toBeNull();
    expect(await getJSON("vaults/anon_session-lazy/vault.json")).toBeNull();
    expect(await getJSON("index/sessions.json")).toBeNull();
  });

  it("creates the anon vault and index entry on the first saved moment", async () => {
    const vault = await readVaultForSession("session-lazy", null);
    expect(await getJSON(`vaults/${vault.id}/vault.json`)).toBeNull();
    await addCapture(vault, {
      id: "cap_saved",
      kind: "text",
      createdAt: "2026-10-04T08:00:00.000Z",
      day: "2026-10-04",
      text: "the kettle",
      ingestStatus: "mock",
    });
    const saved = await loadVault(anonVaultId("session-lazy"));
    expect(saved?.captures.map((capture) => capture.text)).toEqual(["the kettle"]);
    const index = await getJSON<{ sessions: Record<string, { vaultId: string }> }>("index/sessions.json");
    expect(index?.sessions["session-lazy"]?.vaultId).toBe(anonVaultId("session-lazy"));
  });

  it("keeps a returning user's saved moment and a payer's email vault id", async () => {
    const { putJSON } = await import("./storage");
    const id = anonVaultId("session-lazy");
    const day = new Date().toISOString().slice(0, 10);
    const record: VaultRecord = {
      id,
      kind: "anon",
      sessionId: "session-lazy",
      createdAt: "2026-09-01T00:00:00.000Z",
      updatedAt: "2026-09-01T00:00:00.000Z",
      captureIds: ["cap_back"],
      stories: [],
      captures: [
        {
          id: "cap_back",
          vaultId: id,
          kind: "text",
          createdAt: `${day}T08:00:00.000Z`,
          day,
          text: "the old light",
          ingestStatus: "mock",
        },
      ],
    };
    await putJSON(`vaults/${id}/vault.json`, record);
    await putJSON("index/sessions.json", { sessions: { "session-lazy": { vaultId: id } } });

    const res = await sessionGet(new Request("http://localhost/api/session"));
    const body = (await res.json()) as { captureCount: number; vaultId: string };
    expect(body.captureCount).toBe(1);
    expect(body.vaultId).toBe(id);
    expect((await loadVault(id))?.captures).toHaveLength(1);

    jar.set(EMAIL_COOKIE, "amy@example.com");
    const paid = await readVaultForSession("session-pay", "amy@example.com");
    expect(paid.id).toBe(emailVaultId("amy@example.com"));
    expect(paid.email).toBe("amy@example.com");
    expect(await getJSON(`vaults/${paid.id}/vault.json`)).toBeNull();
    await addCapture(paid, {
      id: "cap_paid",
      kind: "photo",
      createdAt: "2026-10-04T09:00:00.000Z",
      day: "2026-10-04",
      source: "app",
      caption: "the window",
      ingestStatus: "mock",
    });
    const emailVault = await loadVault(paid.id);
    expect(emailVault?.kind).toBe("email");
    expect(emailVault?.captures[0]?.caption).toBe("the window");
    const index = await getJSON<{ sessions: Record<string, { vaultId: string; email?: string }> }>(
      "index/sessions.json",
    );
    expect(index?.sessions["session-pay"]).toEqual({
      vaultId: paid.id,
      email: "amy@example.com",
    });
    expect(index?.sessions["session-lazy"]?.vaultId).toBe(id);
  });

  it("starts checkout on the payer's email vault and keeps the pending order", async () => {
    process.env.PF_MERCHANT_ID = "10000100";
    process.env.PF_MERCHANT_KEY = "46f0cd694581a";
    process.env.PF_PASSPHRASE = "test-passphrase";
    process.env.APP_URL = "https://gooddaynight.com";
    signIn("amy@example.com");
    jar.set(SESSION_COOKIE, "session-pay");

    const res = await checkout(new Request("http://localhost/api/payfast/checkout", { method: "POST" }));
    expect(res.status).toBe(200);
    const id = emailVaultId("amy@example.com");
    const vault = await loadVault(id);
    expect(vault?.kind).toBe("email");
    expect(vault?.email).toBe("amy@example.com");
    expect(vault?.sessionId).toBe("session-pay");
    expect(vault?.stories).toEqual([]);
    const index = await getJSON<{ sessions: Record<string, { vaultId: string; email?: string }> }>(
      "index/sessions.json",
    );
    expect(index?.sessions["session-pay"]).toEqual({ vaultId: id, email: "amy@example.com" });
    const orders = await readdir(path.join(dir, "payfast/orders"));
    expect(orders).toHaveLength(1);
    const order = JSON.parse(await readFile(path.join(dir, "payfast/orders", orders[0]), "utf8")) as {
      email?: string;
      status?: string;
    };
    expect(order).toMatchObject({ email: "amy@example.com", status: "pending" });
    expect(await getJSON("vaults/anon_session-pay/vault.json")).toBeNull();
  });
});

function jsonRequest(url: string, body: unknown): Request {
  return new Request(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function signIn(email: string): void {
  const secret = otpSessionSecret();
  if (!secret) throw new Error("missing otp secret");
  jar.set(OTP_COOKIE, sealOtpCookie(email, Math.floor(Date.now() / 1000), secret));
  jar.set(EMAIL_COOKIE, email);
}
