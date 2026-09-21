import { describe, expect, it } from "vitest";
import {
  JOY_NEED,
  PREVIEW_UNREACHABLE,
  explainClientFetchError,
  looksLikeAuthWall,
  readJson,
  readResponsePayload,
} from "./client-fetch";

function jsonResponse(body: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
    ...init,
  });
}

describe("client fetch", () => {
  it("maps Failed to fetch and TypeError to the preview sign-in note", () => {
    expect(explainClientFetchError(new TypeError("Failed to fetch"))).toBe(PREVIEW_UNREACHABLE);
    expect(explainClientFetchError(new Error("Failed to fetch"))).toBe(PREVIEW_UNREACHABLE);
    expect(explainClientFetchError(new Error("NetworkError when attempting to fetch resource."))).toBe(
      PREVIEW_UNREACHABLE,
    );
    expect(explainClientFetchError(new Error("Keep photos under 4.5 MB."))).toBe(
      "Keep photos under 4.5 MB.",
    );
    expect(PREVIEW_UNREACHABLE).not.toMatch(/Failed to fetch/i);
    expect(JOY_NEED).toMatch(/quiet joy/i);
  });

  it("treats HTML, login pages, and redirects as an auth wall", async () => {
    const html = new Response("<!doctype html><html><title>Login</title></html>", {
      status: 200,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
    expect(looksLikeAuthWall(html, "<!doctype html>")).toBe(true);
    await expect(readJson(html.clone())).rejects.toThrow(PREVIEW_UNREACHABLE);

    const sso = new Response("{}", {
      status: 200,
      headers: { "content-type": "application/json" },
    });
    Object.defineProperty(sso, "url", { value: "https://vercel.com/sso-api?url=preview" });
    expect(looksLikeAuthWall(sso, "{}")).toBe(true);

    const bounced = jsonResponse({ ok: true });
    Object.defineProperty(bounced, "redirected", { value: true });
    await expect(readJson(bounced)).rejects.toThrow(PREVIEW_UNREACHABLE);

    const opaque = new Response(null, { status: 200 });
    Object.defineProperty(opaque, "type", { value: "opaqueredirect" });
    expect(looksLikeAuthWall(opaque)).toBe(true);
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
