import { badRequest, json } from "@/lib/http";
import { REVIEW_HIDDEN } from "@/lib/review-copy";
import { openHideToken, setReviewPublished } from "@/lib/review";
import { otpSessionSecret } from "@/lib/otp-session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { token?: unknown } | null;
  const token = typeof body?.token === "string" ? body.token : "";
  const secret = otpSessionSecret();
  if (!secret) return json({ error: "Unavailable" }, 503);
  const id = openHideToken(token, secret);
  if (!id) return badRequest("This link is not valid.");
  const saved = await setReviewPublished(id, false);
  if (!saved) return json({ error: "This review is no longer here." }, 404);
  return json({ ok: true, message: REVIEW_HIDDEN });
}
