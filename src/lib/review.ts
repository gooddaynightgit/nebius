import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";
import { newId } from "./identity";
import { LANDING } from "./landing";
import {
  REVIEW_COMMENT_MAX,
  REVIEW_LONG,
  REVIEW_NAME_LONG,
  REVIEW_NAME_MAX,
  REVIEW_NEED,
  REVIEW_STARS,
} from "./review-copy";
import { getJSON, putJSON } from "./storage";

export const REVIEW_INDEX_KEY = "reviews/index.json";
export const REVIEW_RATE_LIMIT = 5;
export const REVIEW_RATE_WINDOW_MS = 60 * 60 * 1000;

export type StoredReview = {
  id: string;
  stars: number | null;
  comment: string;
  name: string;
  email: string | null;
  createdAt: string;
};

export type ReviewBody = {
  stars?: unknown;
  comment?: unknown;
  name?: unknown;
  website?: unknown;
};

export type ParsedReview =
  | { ok: true; honeypot: true }
  | { ok: true; honeypot: false; stars: number | null; comment: string; name: string }
  | { ok: false; message: string };

const hits = new Map<string, number[]>();

export function reviewObjectKey(id: string): string {
  return `reviews/${id}.json`;
}

export function resetReviewRateLimit(): void {
  hits.clear();
}

export function reviewClientKey(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  if (forwarded) return forwarded;
  const real = request.headers.get("x-real-ip")?.trim();
  return real || "local";
}

/** At most a handful of reviews per hour from one address. Memory-only, per server. */
export function allowReview(key: string, now = Date.now()): boolean {
  const recent = (hits.get(key) ?? []).filter((at) => now - at < REVIEW_RATE_WINDOW_MS);
  if (recent.length >= REVIEW_RATE_LIMIT) {
    hits.set(key, recent);
    return false;
  }
  recent.push(now);
  hits.set(key, recent);
  return true;
}

export function parseReview(body: ReviewBody | null): ParsedReview {
  if (!body || typeof body !== "object") return { ok: false, message: REVIEW_NEED };
  const website = typeof body.website === "string" ? body.website.trim() : "";
  if (website) return { ok: true, honeypot: true };

  let stars: number | null = null;
  if (body.stars !== undefined && body.stars !== null && body.stars !== "") {
    const value = typeof body.stars === "number" ? body.stars : Number(body.stars);
    if (!Number.isInteger(value) || value < 1 || value > 5) {
      return { ok: false, message: REVIEW_STARS };
    }
    stars = value;
  }

  if (body.comment !== undefined && body.comment !== null && typeof body.comment !== "string") {
    return { ok: false, message: REVIEW_NEED };
  }
  const comment = typeof body.comment === "string" ? body.comment.trim() : "";
  if (comment.length > REVIEW_COMMENT_MAX) return { ok: false, message: REVIEW_LONG };

  if (body.name !== undefined && body.name !== null && typeof body.name !== "string") {
    return { ok: false, message: REVIEW_NAME_LONG };
  }
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (name.length > REVIEW_NAME_MAX) return { ok: false, message: REVIEW_NAME_LONG };

  if (stars === null && comment.length === 0) return { ok: false, message: REVIEW_NEED };
  return { ok: true, honeypot: false, stars, comment, name };
}

export async function saveReview(input: {
  stars: number | null;
  comment: string;
  name: string;
  email: string | null;
  now?: Date;
  id?: string;
}): Promise<StoredReview> {
  const review: StoredReview = {
    id: input.id ?? newId("review"),
    stars: input.stars,
    comment: input.comment,
    name: input.name,
    email: input.email,
    createdAt: (input.now ?? new Date()).toISOString(),
  };
  await putJSON(reviewObjectKey(review.id), review);
  try {
    const current = await getJSON<unknown>(REVIEW_INDEX_KEY);
    const index = Array.isArray(current) ? current.filter((item): item is string => typeof item === "string") : [];
    if (!index.includes(review.id)) index.push(review.id);
    await putJSON(REVIEW_INDEX_KEY, index);
  } catch (error) {
    console.error("[review] index update failed", error);
  }
  return review;
}

export function reviewEmailText(review: StoredReview): string {
  return [
    "A new GoodDayNight review",
    "",
    `Stars: ${review.stars ?? "(none)"}`,
    `Name: ${review.name || "(not given)"}`,
    `Email: ${review.email || "(not signed in)"}`,
    "Comment:",
    review.comment || "(none)",
    "",
    `id: ${review.id}`,
  ].join("\n");
}

/** Sends when the same SES settings as sign-in codes are present. A miss still keeps the saved review. */
export async function emailReview(review: StoredReview): Promise<boolean> {
  const from = process.env.SES_NOREPLY?.trim();
  const region = process.env.AWS_REGION?.trim();
  if (!from || !region) return false;
  try {
    const ses = new SESClient({ region });
    await ses.send(
      new SendEmailCommand({
        Source: from,
        Destination: { ToAddresses: [LANDING.footer.hello] },
        Message: {
          Subject: { Data: "A new GoodDayNight review", Charset: "UTF-8" },
          Body: { Text: { Data: reviewEmailText(review), Charset: "UTF-8" } },
        },
      }),
    );
    return true;
  } catch (error) {
    console.error("[review] email failed", error);
    return false;
  }
}
