import { describe, expect, it } from "vitest";
import {
  JOY_NEED,
  PREVIEW_UNREACHABLE,
  PRODUCTION_UNREACHABLE,
  UNEXPECTED_RESPONSE,
  explainClientFetchError,
  isPreviewHost,
  looksLikeAuthWall,
  readJson,
  readResponsePayload,
  reachabilityMessage,
} from "./client-fetch";

function jsonResponse(body: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
    ...init,
  });
}

describe("client fetch", () => {
  it("uses a live connection note on production, preview sign-in only on preview hosts", () => {
    expect(isPreviewHost("nebius-liart.vercel.app")).toBe(false);
    expect(isPreviewHost("gooddaynight.com")).toBe(false);
    expect(isPreviewHost("localhost")).toBe(false);
    expect(isPreviewHost("nebius-git-cursor-photo-buttons-live-reach-1362-gooddaynightgit.vercel.app")).toBe(
      true,
    );
    expect(reachabilityMessage("nebius-liart.vercel.app")).toBe(PRODUCTION_UNREACHABLE);
    expect(reachabilityMessage("nebius-git-foo.vercel.app")).toBe(PREVIEW_UNREACHABLE);
    expect(explainClientFetchError(new TypeError("Failed to fetch"), "nebius-liart.vercel.app")).toBe(
      PRODUCTION_UNREACHABLE,
    );
    expect(explainClientFetchError(new TypeError("Failed to fetch"), "nebius-git-foo.vercel.app")).toBe(
      PREVIEW_UNREACHABLE,
    );
    expect(explainClientFetchError(new Error("Keep photos under 4.5 MB."))).toBe(
      "Keep photos under 4.5 MB.",
    );
    expect(PREVIEW_UNREACHABLE).not.toMatch(/Failed to fetch/i);
    expect(PRODUCTION_UNREACHABLE).toMatch(/check your connection/i);
    expect(JOY_NEED).toMatch(/quiet joy/i);
  });

  it("treats HTML and SSO login pages as an auth wall, but not a plain redirect", async () => {
    const html = new Response("<!doctype html><html><title>Login</title></html>", {
      status: 200,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
    expect(looksLikeAuthWall(html, "<!doctype html>")).toBe(true);
    await expect(readJson(html.clone(), "nebius-liart.vercel.app")).rejects.toThrow(UNEXPECTED_RESPONSE);
    await expect(readJson(html.clone(), "nebius-git-foo.vercel.app")).rejects.toThrow(PREVIEW_UNREACHABLE);

    const sso = new Response("{}", {
      status: 200,
      headers: { "content-type": "application/json" },
    });
    Object.defineProperty(sso, "url", { value: "https://vercel.com/sso-api?url=preview" });
    expect(looksLikeAuthWall(sso, "{}")).toBe(true);

    const bounced = jsonResponse({ ok: true });
    Object.defineProperty(bounced, "redirected", { value: true });
    expect(looksLikeAuthWall(bounced, JSON.stringify({ ok: true }))).toBe(false);
    await expect(readJson(bounced, "nebius-liart.vercel.app")).resolves.toEqual({ ok: true });
  });

  it("uses an unexpected-response note for non-JSON on production", async () => {
    const garbage = new Response("not-json {{{", {
      status: 200,
      headers: { "content-type": "application/json" },
    });
    await expect(readJson(garbage, "nebius-liart.vercel.app")).rejects.toThrow(UNEXPECTED_RESPONSE);
    const previewGarbage = new Response("not-json {{{", {
      status: 200,
      headers: { "content-type": "application/json" },
    });
    await expect(readJson(previewGarbage, "nebius-git-foo.vercel.app")).rejects.toThrow(
      PREVIEW_UNREACHABLE,
    );
  });

  it("reads JSON errors as their server message, not Failed to fetch", async () => {
    const bad = jsonResponse({ error: "Pick the kind of quiet joy first." }, { status: 400 });
    await expect(readJson(bad)).rejects.toThrow(JOY_NEED);
    const ok = jsonResponse({ sessionId: "s1" });
    await expect(readJson<{ sessionId: string }>(ok)).resolves.toEqual({ sessionId: "s1" });
    const loose = jsonResponse({ code: "missing", error: "Save today's photo first." }, { status: 404 });
    await expect(readResponsePayload<{ code: string }>(loose)).resolves.toMatchObject({
      code: "missing",
    });
  });
});
