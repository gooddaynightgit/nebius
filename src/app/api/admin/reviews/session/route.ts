import { ADMIN_COOKIE, ADMIN_TOKEN_HINT, adminConfigured, adminCookieValue, adminTokenMatches } from "@/lib/review-admin";
import { json, unauthorized } from "@/lib/http";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!adminConfigured()) return json({ error: ADMIN_TOKEN_HINT }, 503);
  const body = (await request.json().catch(() => null)) as { token?: unknown } | null;
  const token = typeof body?.token === "string" ? body.token : "";
  if (!adminTokenMatches(token)) return unauthorized("That token did not match.");
  const res = json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, adminCookieValue(process.env.ADMIN_TOKEN!.trim()), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 12,
  });
  return res;
}
