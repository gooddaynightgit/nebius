import { beforeEach, describe, expect, it, vi } from "vitest";
import { REVIEW_KIND, REVIEW_LONG, REVIEW_LOW, REVIEW_NEED, REVIEW_SLOW, REVIEW_STARS, REVIEW_THANKS } from "./review-copy";
import { REVIEW_INDEX_KEY, resetReviewRateLimit } from "./review";

const { store, send, sent } = vi.hoisted(() => {
  const store = new Map<string, unknown>();
  const sent: Array<{ input: { Destination?: { ToAddresses?: string[] }; Message?: { Body?: { Text?: { Data?: string } } } } }> = [];
  const send = vi.fn(async (command: { input: (typeof sent)[number]["input"] }) => {
    sent.push({ input: command.input });
    return {};
  });
  return { store, send, sent };
});

vi.mock("@/lib/storage", () => ({
  putJSON: vi.fn(async (key: string, value: unknown) => {
    store.set(key, value);
  }),
  getJSON: vi.fn(async (key: string) => (store.has(key) ? store.get(key) : null)),
}));

vi.mock("@/lib/session", () => ({
  readOtpSession: vi.fn(),
  readGateEmail: vi.fn(),
}));

vi.mock("@aws-sdk/client-ses", () => ({
  SESClient: class {
    send = send;
  },
  SendEmailCommand: class {
    input: unknown;
    constructor(input: unknown) {
      this.input = input;
    }
  },
}));

import { POST } from "@/app/api/review/route";
import { readGateEmail, readOtpSession } from "@/lib/session";

type SavedReview = {
  id: string;
  stars: number | null;
  comment: string;
  name: string;
  email: string | null;
  published?: boolean;
};

function post(body: unknown, ip = "203.0.113.10") {
  return POST(
    new Request("http://localhost/api/review", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-forwarded-for": ip,
      },
      body: JSON.stringify(body),
    }),
  );
}

function savedReviews(): SavedReview[] {
  return [...store.entries()]
    .filter(([key]) => key.startsWith("reviews/review_"))
    .map(([, value]) => value as SavedReview);
}

describe("review API", () => {
  beforeEach(() => {
    store.clear();
    sent.length = 0;
    send.mockClear();
    send.mockImplementation(async (command: { input: (typeof sent)[number]["input"] }) => {
      sent.push({ input: command.input });
      return {};
    });
    resetReviewRateLimit();
    vi.mocked(readOtpSession).mockReset();
    vi.mocked(readGateEmail).mockReset();
    vi.mocked(readOtpSession).mockResolvedValue(null);
    vi.mocked(readGateEmail).mockResolvedValue(null);
    delete process.env.SES_NOREPLY;
    delete process.env.AWS_REGION;
  });

  it("saves a star rating without a comment", async () => {
    const res = await post({ stars: 4, comment: "   ", name: "  Amy  " });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, message: REVIEW_THANKS, emailed: false });
    const [review] = savedReviews();
    expect(review.stars).toBe(4);
    expect(review.comment).toBe("");
    expect(review.name).toBe("Amy");
    expect(review.email).toBeNull();
    expect(store.get(REVIEW_INDEX_KEY)).toEqual([review.id]);
  });

  it("saves a trimmed comment without stars", async () => {
    const res = await post({ comment: "  The quiet stayed.  " });
    expect(res.status).toBe(200);
    const [review] = savedReviews();
    expect(review.stars).toBeNull();
    expect(review.comment).toBe("The quiet stayed.");
  });

  it("requires a star or a comment", async () => {
    const res = await post({ name: "Amy" });
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: REVIEW_NEED });
    expect(savedReviews()).toEqual([]);
  });

  it("rejects a star outside 1 to 5", async () => {
    const res = await post({ stars: 6, comment: "Hello" }, "203.0.113.11");
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: REVIEW_STARS });
    expect(savedReviews()).toEqual([]);
  });

  it("rejects a comment over 1000 characters", async () => {
    const res = await post({ comment: "a".repeat(1001) }, "203.0.113.12");
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: REVIEW_LONG });
  });

  it("accepts a comment of 1000 characters", async () => {
    const comment = "b".repeat(1000);
    const res = await post({ comment }, "203.0.113.13");
    expect(res.status).toBe(200);
    expect(savedReviews()[0]?.comment).toBe(comment);
  });

  it("drops a honeypot submission without saving", async () => {
    const res = await post({ stars: 5, comment: "spam", website: "https://example.com" }, "203.0.113.14");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, message: REVIEW_THANKS });
    expect(savedReviews()).toEqual([]);
    expect(send).not.toHaveBeenCalled();
  });

  it("slows a sixth review from the same address", async () => {
    const ip = "203.0.113.15";
    for (let i = 0; i < 5; i += 1) {
      const res = await post({ stars: 3 }, ip);
      expect(res.status).toBe(200);
    }
    const blocked = await post({ stars: 3 }, ip);
    expect(blocked.status).toBe(429);
    expect(await blocked.json()).toEqual({ error: REVIEW_SLOW });
    expect(savedReviews()).toHaveLength(5);
  });

  it("attaches the signed-in email and ignores an email in the body", async () => {
    vi.mocked(readOtpSession).mockResolvedValue({ email: "amy@email.com" });
    vi.mocked(readGateEmail).mockResolvedValue("amy@email.com");
    const res = await post({ stars: 5, email: "other@email.com" }, "203.0.113.16");
    expect(res.status).toBe(200);
    expect(savedReviews()[0]?.email).toBe("amy@email.com");
  });

  it("leaves the email empty when the cookies do not match", async () => {
    vi.mocked(readOtpSession).mockResolvedValue({ email: "amy@email.com" });
    vi.mocked(readGateEmail).mockResolvedValue("other@email.com");
    const res = await post({ comment: "Still glad." }, "203.0.113.17");
    expect(res.status).toBe(200);
    expect(savedReviews()[0]?.email).toBeNull();
  });

  it("emails hello@gooddaynight.com when SES is configured", async () => {
    process.env.SES_NOREPLY = "noreply@gooddaynight.com";
    process.env.AWS_REGION = "eu-west-1";
    const res = await post({ stars: 5, comment: "  Kept.  ", name: "Amy" }, "203.0.113.18");
    expect(res.status).toBe(200);
    expect((await res.json()).emailed).toBe(true);
    expect(sent).toHaveLength(1);
    expect(sent[0]?.input.Destination?.ToAddresses).toEqual(["hello@gooddaynight.com"]);
    expect(sent[0]?.input.Message?.Body?.Text?.Data).toMatch(/Stars: 5/);
    expect(sent[0]?.input.Message?.Body?.Text?.Data).toMatch(/Kept\./);
    expect(sent[0]?.input.Message?.Body?.Text?.Data).toMatch(/Email: \(not signed in\)/);
    expect(sent[0]?.input.Message?.Body?.Text?.Data).toMatch(/Hide this review:/);
    expect(sent[0]?.input.Message?.Body?.Text?.Data).toMatch(/\/review\/hide\?token=/);
    expect(savedReviews()[0]?.published).toBe(true);
  });

  it("still saves the review when the email send fails", async () => {
    process.env.SES_NOREPLY = "noreply@gooddaynight.com";
    process.env.AWS_REGION = "eu-west-1";
    send.mockRejectedValueOnce(new Error("ses down"));
    const res = await post({ stars: 4 }, "203.0.113.19");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, message: REVIEW_THANKS, emailed: false });
    expect(savedReviews()).toHaveLength(1);
  });

  it("does not store or email a comment with profanity", async () => {
    process.env.SES_NOREPLY = "noreply@gooddaynight.com";
    process.env.AWS_REGION = "eu-west-1";
    const res = await post({ stars: 5, comment: "This is f*cking awful", name: "Amy" }, "203.0.113.20");
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: REVIEW_KIND });
    expect(savedReviews()).toEqual([]);
    expect(send).not.toHaveBeenCalled();
  });

  it("does not store or email a name with obfuscated profanity", async () => {
    process.env.SES_NOREPLY = "noreply@gooddaynight.com";
    process.env.AWS_REGION = "eu-west-1";
    const res = await post({ stars: 5, comment: "The light stayed.", name: "sh1t" }, "203.0.113.21");
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: REVIEW_KIND });
    expect(savedReviews()).toEqual([]);
    expect(send).not.toHaveBeenCalled();
  });

  it("does not store or email a 1 or 2 star review", async () => {
    process.env.SES_NOREPLY = "noreply@gooddaynight.com";
    process.env.AWS_REGION = "eu-west-1";
    const one = await post({ stars: 1, comment: "Not for me." }, "203.0.113.22");
    expect(one.status).toBe(200);
    expect(await one.json()).toEqual({ ok: true, message: REVIEW_LOW, emailed: false });
    const two = await post({ stars: 2, comment: "I wanted more." }, "203.0.113.23");
    expect(two.status).toBe(200);
    expect(await two.json()).toEqual({ ok: true, message: REVIEW_LOW, emailed: false });
    expect(savedReviews()).toEqual([]);
    expect(send).not.toHaveBeenCalled();
  });

  it("asks for kinder words before the low-star note when both apply", async () => {
    const res = await post({ stars: 1, comment: "f*ck" }, "203.0.113.24");
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: REVIEW_KIND });
    expect(savedReviews()).toEqual([]);
  });

  it("publishes a kind 4 or 5 star review and keeps a 3 star review private", async () => {
    process.env.SES_NOREPLY = "noreply@gooddaynight.com";
    process.env.AWS_REGION = "eu-west-1";
    process.env.APP_URL = "https://gooddaynight.com";
    const high = await post({ stars: 5, comment: "The quiet stayed.", name: "Amy Hassan", email: "amy@email.com" }, "203.0.113.30");
    expect(high.status).toBe(200);
    const mid = await post({ stars: 3, comment: "It was alright.", name: "Sam" }, "203.0.113.31");
    expect(mid.status).toBe(200);
    expect((await mid.json()).emailed).toBe(true);
    const four = await post({ stars: 4, name: "Noor" }, "203.0.113.32");
    expect(four.status).toBe(200);

    const saved = savedReviews();
    expect(saved.find((review) => review.stars === 5)?.published).toBe(true);
    expect(saved.find((review) => review.stars === 4)?.published).toBe(true);
    expect(saved.find((review) => review.stars === 3)?.published).toBe(false);
    expect(sent).toHaveLength(3);

    const { listPublishedReviews } = await import("./review");
    const shown = await listPublishedReviews();
    expect(shown.map((review) => review.stars).sort()).toEqual([4, 5]);
    expect(shown.map((review) => review.name).sort()).toEqual(["Amy", "Noor"]);
    expect(JSON.stringify(shown)).not.toMatch(/amy@email.com|@/);
    expect(shown.some((review) => review.comment === "It was alright.")).toBe(false);
  });
});
