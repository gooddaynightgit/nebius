import { beforeEach, describe, expect, it, vi } from "vitest";
import { REVIEW_HIDDEN } from "./review-copy";

const { store } = vi.hoisted(() => {
  const store = new Map<string, unknown>();
  return { store };
});

vi.mock("@/lib/storage", () => ({
  putJSON: vi.fn(async (key: string, value: unknown) => {
    store.set(key, value);
  }),
  getJSON: vi.fn(async (key: string) => (store.has(key) ? store.get(key) : null)),
}));

import { POST as hide } from "@/app/api/review/hide/route";
import { GET as adminList, POST as adminUpdate } from "@/app/api/admin/reviews/route";
import { POST as adminSession } from "@/app/api/admin/reviews/session/route";
import { ADMIN_TOKEN_HINT, adminCookieMatches, adminCookieValue } from "./review-admin";
import { listPublishedReviews, openHideToken, sealHideToken, setReviewPublished } from "./review";

const SECRET = "test-hide-secret";

function seed(review: { id: string; stars: number; comment: string; name: string; email: string | null; published: boolean; createdAt: string }) {
  store.set(`reviews/${review.id}.json`, review);
  const index = (store.get("reviews/index.json") as string[] | undefined) ?? [];
  store.set("reviews/index.json", [...index, review.id]);
}

describe("review hide link", () => {
  beforeEach(() => {
    store.clear();
    process.env.OTP_SESSION_SECRET = SECRET;
    delete process.env.ADMIN_TOKEN;
  });

  it("rejects a guessed token and hides with the signed one", async () => {
    seed({
      id: "review_publicone",
      stars: 5,
      comment: "The quiet stayed.",
      name: "Amy Hassan",
      email: "amy@email.com",
      published: true,
      createdAt: "2026-09-26T01:00:00.000Z",
    });
    const token = sealHideToken("review_publicone", SECRET);
    expect(openHideToken("review_publicone.forged", SECRET)).toBeNull();
    expect(openHideToken(token, "other-secret")).toBeNull();

    const bad = await hide(new Request("http://localhost/api/review/hide", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token: "nope.nope" }),
    }));
    expect(bad.status).toBe(400);
    expect((store.get("reviews/review_publicone.json") as { published: boolean }).published).toBe(true);

    const ok = await hide(new Request("http://localhost/api/review/hide", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token }),
    }));
    expect(ok.status).toBe(200);
    expect(await ok.json()).toEqual({ ok: true, message: REVIEW_HIDDEN });
    expect((store.get("reviews/review_publicone.json") as { published: boolean; email: string }).email).toBe("amy@email.com");
    expect((store.get("reviews/review_publicone.json") as { published: boolean }).published).toBe(false);
    const shown = await listPublishedReviews();
    expect(shown).toEqual([]);
    expect(JSON.stringify(shown)).not.toMatch(/amy@email.com/);
  });
});

describe("admin reviews", () => {
  beforeEach(() => {
    store.clear();
    process.env.ADMIN_TOKEN = "owner-token";
  });

  it("refuses a missing or wrong token", async () => {
    delete process.env.ADMIN_TOKEN;
    const missing = await adminSession(new Request("http://localhost/api/admin/reviews/session", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token: "owner-token" }),
    }));
    expect(missing.status).toBe(503);
    expect(await missing.json()).toEqual({ error: ADMIN_TOKEN_HINT });

    process.env.ADMIN_TOKEN = "owner-token";
    const wrong = await adminList(new Request("http://localhost/api/admin/reviews", {
      headers: { authorization: "Bearer nope" },
    }));
    expect(wrong.status).toBe(401);
  });

  it("lists reviews without emails and can hide or show a 4 or 5 star note", async () => {
    seed({
      id: "review_shown",
      stars: 5,
      comment: "The quiet stayed.",
      name: "Amy Hassan",
      email: "amy@email.com",
      published: true,
      createdAt: "2026-09-26T02:00:00.000Z",
    });
    seed({
      id: "review_mid",
      stars: 3,
      comment: "It was alright.",
      name: "Sam",
      email: "sam@email.com",
      published: false,
      createdAt: "2026-09-26T01:00:00.000Z",
    });

    const session = await adminSession(new Request("http://localhost/api/admin/reviews/session", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token: "owner-token" }),
    }));
    expect(session.status).toBe(200);
    const setCookie = session.headers.get("set-cookie") ?? "";
    expect(setCookie).toMatch(/gdn_admin=/);
    expect(adminCookieMatches(adminCookieValue("owner-token"))).toBe(true);

    const listed = await adminList(new Request("http://localhost/api/admin/reviews", {
      headers: { authorization: "Bearer owner-token" },
    }));
    const body = await listed.json() as { reviews: Array<{ name: string; published: boolean }> };
    expect(JSON.stringify(body)).not.toMatch(/amy@email.com|sam@email.com/);
    expect(body.reviews.map((review) => review.name)).toEqual(["Amy", "Sam"]);

    const hidden = await adminUpdate(new Request("http://localhost/api/admin/reviews", {
      method: "POST",
      headers: { authorization: "Bearer owner-token", "content-type": "application/json" },
      body: JSON.stringify({ id: "review_shown", published: false }),
    }));
    expect(await hidden.json()).toEqual({ ok: true, published: false });

    const shownAgain = await adminUpdate(new Request("http://localhost/api/admin/reviews", {
      method: "POST",
      headers: { authorization: "Bearer owner-token", "content-type": "application/json" },
      body: JSON.stringify({ id: "review_shown", published: true }),
    }));
    expect(await shownAgain.json()).toEqual({ ok: true, published: true });

    const keepPrivate = await setReviewPublished("review_mid", true);
    expect(keepPrivate?.published).toBe(false);
    expect(await listPublishedReviews()).toEqual([
      expect.objectContaining({ id: "review_shown", name: "Amy", stars: 5 }),
    ]);
  });
});
