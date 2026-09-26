import { adminRequestOk } from "@/lib/review-admin";
import { badRequest, json, unauthorized } from "@/lib/http";
import { listAdminReviews, setReviewPublished } from "@/lib/review";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  if (!adminRequestOk(request)) return unauthorized("That token did not match.");
  const reviews = await listAdminReviews();
  return json({ reviews });
}

export async function POST(request: Request) {
  if (!adminRequestOk(request)) return unauthorized("That token did not match.");
  const body = (await request.json().catch(() => null)) as { id?: unknown; published?: unknown } | null;
  const id = typeof body?.id === "string" ? body.id : "";
  if (!id.startsWith("review_") || typeof body?.published !== "boolean") {
    return badRequest("Choose a review first.");
  }
  const saved = await setReviewPublished(id, body.published);
  if (!saved) return json({ error: "This review is no longer here." }, 404);
  return json({ ok: true, published: saved.published });
}
