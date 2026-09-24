import { createHmac, timingSafeEqual } from "node:crypto";
import { isValidEmail, normalizeEmail } from "./identity";

export const OTP_COOKIE = "gdn_otp";
/** Verified sign-in lasts this long, then personal photos and checkout ask again. */
export const OTP_SESSION_TTL_SECONDS = 12 * 60 * 60;

export function otpSessionTtlSeconds(): number {
  const raw = Number(process.env.OTP_SESSION_TTL_SECONDS);
  if (Number.isFinite(raw) && raw >= 60 && raw <= 60 * 60 * 24) return Math.floor(raw);
  return OTP_SESSION_TTL_SECONDS;
}

/** Production refuses to sign a session without OTP_SESSION_SECRET. */
export function otpSessionSecret(): string | null {
  const fromEnv = process.env.OTP_SESSION_SECRET?.trim();
  if (fromEnv) return fromEnv;
  if (process.env.NODE_ENV === "production") return null;
  return "gooddaynight-dev-otp-session";
}

export function sealOtpCookie(
  email: string,
  nowSec: number,
  secret: string,
  ttl = otpSessionTtlSeconds(),
): string {
  const payload = Buffer.from(
    JSON.stringify({ e: normalizeEmail(email), exp: nowSec + ttl }),
    "utf8",
  ).toString("base64url");
  const sig = createHmac("sha256", secret).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}

export function openOtpCookie(
  value: string,
  nowSec: number,
  secret: string,
): { email: string } | null {
  const dot = value.lastIndexOf(".");
  if (dot <= 0) return null;
  const payload = value.slice(0, dot);
  const sig = value.slice(dot + 1);
  const expected = createHmac("sha256", secret).update(payload).digest("base64url");
  const left = Buffer.from(sig);
  const right = Buffer.from(expected);
  if (left.length !== right.length || !timingSafeEqual(left, right)) return null;
  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
      e?: unknown;
      exp?: unknown;
    };
    if (typeof parsed.e !== "string" || typeof parsed.exp !== "number") return null;
    if (!Number.isFinite(parsed.exp) || parsed.exp <= nowSec) return null;
    if (!isValidEmail(parsed.e)) return null;
    return { email: normalizeEmail(parsed.e) };
  } catch {
    return null;
  }
}

export function otpAllowsEmail(otp: { email: string } | null, email: string): boolean {
  if (!otp || !isValidEmail(email)) return false;
  return otp.email === normalizeEmail(email);
}
