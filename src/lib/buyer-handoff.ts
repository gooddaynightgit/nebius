import { createHmac, timingSafeEqual } from "node:crypto";
import { isValidEmail, normalizeEmail } from "./identity";
import { otpSessionSecret } from "./otp-session";

/** How long a PayFast return may restore the session that checkout already verified. */
export const BUYER_HANDOFF_TTL_SECONDS = 2 * 60 * 60;

type HandoffPayload = {
  e: string;
  exp: number;
  k: "return";
};

/**
 * Signed proof that this browser verified the email before leaving for PayFast.
 * A bare email, a payment ref, or `gdn_em` is not this token.
 */
export function sealBuyerHandoff(
  email: string,
  nowSec: number,
  secret: string,
  ttl = BUYER_HANDOFF_TTL_SECONDS,
): string {
  const payload = Buffer.from(
    JSON.stringify({ e: normalizeEmail(email), exp: nowSec + ttl, k: "return" } satisfies HandoffPayload),
    "utf8",
  ).toString("base64url");
  const sig = createHmac("sha256", secret).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}

export function openBuyerHandoff(
  value: string,
  nowSec: number,
  secret: string,
): { email: string } | null {
  if (!value || value.length > 600) return null;
  const dot = value.lastIndexOf(".");
  if (dot <= 0) return null;
  const payload = value.slice(0, dot);
  const sig = value.slice(dot + 1);
  const expected = createHmac("sha256", secret).update(payload).digest("base64url");
  const left = Buffer.from(sig);
  const right = Buffer.from(expected);
  if (left.length !== right.length || !timingSafeEqual(left, right)) return null;
  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as Partial<HandoffPayload>;
    if (parsed.k !== "return") return null;
    if (typeof parsed.e !== "string" || typeof parsed.exp !== "number") return null;
    if (!Number.isFinite(parsed.exp) || parsed.exp <= nowSec) return null;
    if (!isValidEmail(parsed.e)) return null;
    return { email: normalizeEmail(parsed.e) };
  } catch {
    return null;
  }
}

/**
 * PayFast sends the buyer back in a browser that may not have the session cookie.
 * The return URL carries a short-lived signed handoff, not the email itself.
 * Without a signing secret, fall back to the photo page and let it ask again.
 */
export function buyerReturnUrl(origin: string, ref: string, email: string, nowSec = Math.floor(Date.now() / 1000)): string {
  const paid = `${origin}/app?paid=1&ref=${ref}`;
  const secret = otpSessionSecret();
  if (!secret || !isValidEmail(email)) return paid;
  const handoff = sealBuyerHandoff(email, nowSec, secret);
  return `${origin}/api/auth/return?paid=1&ref=${ref}&handoff=${encodeURIComponent(handoff)}`;
}
