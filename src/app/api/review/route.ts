import { badRequest, json } from "@/lib/http";
import { isUnkindReview } from "@/lib/review-filter";
import { REVIEW_KIND, REVIEW_LOW, REVIEW_SLOW, REVIEW_THANKS, REVIEW_UNAVAILABLE } from "@/lib/review-copy";
import { allowReview, emailReview, parseReview, reviewClientKey, saveReview, type ReviewBody } from "@/lib/review";
import { readGateEmail, readOtpSession } from "@/lib/session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function signedInEmail(): Promise<string | null> {
  const otp = await readOtpSession();
  const gate = await readGateEmail();
  if (!otp || !gate || otp.email !== gate) return null;
  return gate;
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as ReviewBody | null;
  const parsed = parseReview(body);
  if (!parsed.ok) return badRequest(parsed.message);
  if (parsed.honeypot) return json({ ok: true, message: REVIEW_THANKS });
  if (!allowReview(reviewClientKey(request))) return json({ error: REVIEW_SLOW }, 429);
  if (isUnkindReview(parsed.comment, parsed.name)) return badRequest(REVIEW_KIND);
  if (parsed.stars === 1 || parsed.stars === 2) {
    return json({ ok: true, message: REVIEW_LOW, emailed: false });
  }

  try {
    const review = await saveReview({
      stars: parsed.stars,
      comment: parsed.comment,
      name: parsed.name,
      email: await signedInEmail(),
    });
    const emailed = await emailReview(review);
    return json({ ok: true, message: REVIEW_THANKS, emailed });
  } catch (error) {
    console.error("[review] save failed", error);
    return json({ error: REVIEW_UNAVAILABLE }, 503);
  }
}
