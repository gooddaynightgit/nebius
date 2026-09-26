import { createHash, createHmac, timingSafeEqual } from "node:crypto";

export const ADMIN_COOKIE = "gdn_admin";
export const ADMIN_TOKEN_HINT = "Set ADMIN_TOKEN to open this page.";

export function adminConfigured(): boolean {
  return Boolean(process.env.ADMIN_TOKEN?.trim());
}

export function adminTokenMatches(supplied: string): boolean {
  const expected = process.env.ADMIN_TOKEN?.trim() ?? "";
  if (!expected || !supplied) return false;
  const left = createHash("sha256").update(supplied).digest();
  const right = createHash("sha256").update(expected).digest();
  return timingSafeEqual(left, right);
}

export function adminCookieValue(token: string): string {
  return createHmac("sha256", token).update("gooddaynight-admin-reviews").digest("base64url");
}

export function adminCookieMatches(cookie: string | undefined | null): boolean {
  const expected = process.env.ADMIN_TOKEN?.trim();
  if (!expected || !cookie) return false;
  const want = adminCookieValue(expected);
  const left = Buffer.from(cookie);
  const right = Buffer.from(want);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export function adminRequestOk(request: Request): boolean {
  if (!adminConfigured()) return false;
  const bearer = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim() ?? "";
  if (bearer && adminTokenMatches(bearer)) return true;
  const raw = request.headers.get("cookie") ?? "";
  const match = raw.match(/(?:^|;\s*)gdn_admin=([^;]+)/);
  if (!match?.[1]) return false;
  return adminCookieMatches(decodeURIComponent(match[1]));
}
