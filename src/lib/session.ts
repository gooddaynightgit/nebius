import { cookies } from "next/headers";
import { randomUUID } from "node:crypto";
import { isValidEmail, normalizeEmail, todayStamp } from "./identity";
import { unauthorized } from "./http";
import {
  OTP_COOKIE,
  openOtpCookie,
  otpSessionSecret,
  otpSessionTtlSeconds,
  sealOtpCookie,
} from "./otp-session";
import {
  attachEmail,
  capturesForDay,
  getOrCreateAnonVault,
  lastStoryForDay,
  appPhotoForDay,
  hasSavedMoment,
  isYoursOpened,
  scrubExpiredCaptions,
} from "./vault";
import type { SessionState, VaultRecord } from "./types";

export const SESSION_COOKIE = "gdn_sid";
export const EMAIL_COOKIE = "gdn_em";

const cookieBase = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: 60 * 60 * 24 * 370,
};

export async function readSessionId(): Promise<string> {
  const jar = await cookies();
  const existing = jar.get(SESSION_COOKIE)?.value;
  if (existing) return existing;
  const sessionId = randomUUID();
  jar.set(SESSION_COOKIE, sessionId, cookieBase);
  return sessionId;
}

export async function setGateEmail(email: string): Promise<void> {
  const jar = await cookies();
  jar.set(EMAIL_COOKIE, normalizeEmail(email), cookieBase);
}

export async function readGateEmail(): Promise<string | null> {
  const jar = await cookies();
  const raw = jar.get(EMAIL_COOKIE)?.value;
  if (!raw || !isValidEmail(raw)) return null;
  return normalizeEmail(raw);
}

/** Sets gdn_em and the signed gdn_otp cookie together. Returns false if the session cannot be signed. */
export async function setOtpSession(email: string): Promise<boolean> {
  const secret = otpSessionSecret();
  if (!secret || !isValidEmail(email)) return false;
  const normalized = normalizeEmail(email);
  const ttl = otpSessionTtlSeconds();
  const jar = await cookies();
  jar.set(OTP_COOKIE, sealOtpCookie(normalized, Math.floor(Date.now() / 1000), secret, ttl), {
    ...cookieBase,
    maxAge: ttl,
  });
  await setGateEmail(normalized);
  return true;
}

/** Ends the signed-in cookies only. The vault and saved moments stay. */
export async function clearOtpSession(): Promise<void> {
  const jar = await cookies();
  const expired = { ...cookieBase, maxAge: 0 };
  jar.set(OTP_COOKIE, "", expired);
  jar.set(EMAIL_COOKIE, "", expired);
}

export async function readOtpSession(): Promise<{ email: string } | null> {
  const secret = otpSessionSecret();
  if (!secret) return null;
  const jar = await cookies();
  const raw = jar.get(OTP_COOKIE)?.value;
  if (!raw) return null;
  return openOtpCookie(raw, Math.floor(Date.now() / 1000), secret);
}

/** Same signed-in check as personal-photo routes: matching gdn_otp and gdn_em cookies. */
export async function isPersonalPhotoSession(): Promise<boolean> {
  const otp = await readOtpSession();
  const gate = await readGateEmail();
  return Boolean(otp && gate && otp.email === gate);
}

/** Personal-photo routes. Joy picks do not call this. A bare gdn_em cookie is not enough. */
export async function requirePersonalPhotoOtp() {
  if (!(await isPersonalPhotoSession())) {
    return unauthorized("Verify your email to open personal photos.");
  }
  return null;
}

export function toPublicSession(
  vault: VaultRecord,
  sessionId: string,
  day: string,
): SessionState {
  const today = capturesForDay(vault, day);
  const todayPhoto = appPhotoForDay(vault, day);
  const opened = isYoursOpened(vault, day);
  const photo = todayPhoto
    ? opened
      ? { ...todayPhoto, caption: undefined }
      : todayPhoto
    : null;
  return {
    sessionId,
    vaultId: vault.id,
    email: vault.email ?? null,
    captureCount: vault.captures.length,
    todayCount: today.length,
    canHearStory: opened,
    lastStory: lastStoryForDay(vault, day),
    todayPhoto: photo,
    hasSavedMoment: hasSavedMoment(vault),
    yoursOpened: opened,
    canReplacePhoto: Boolean(todayPhoto),
    otpVerified: false,
  };
}

export async function presentSession(
  vault: VaultRecord,
  sessionId: string,
  day: string,
): Promise<SessionState> {
  await scrubExpiredCaptions(vault, day);
  const state = toPublicSession(vault, sessionId, day);
  const otp = await readOtpSession();
  state.otpVerified = Boolean(otp && (!state.email || otp.email === state.email));
  return state;
}

export async function loadSessionVault(): Promise<{
  sessionId: string;
  vault: VaultRecord;
  day: string;
}> {
  const sessionId = await readSessionId();
  let vault = await getOrCreateAnonVault(sessionId);
  const gate = await readGateEmail();
  if (gate && vault.email !== gate) {
    vault = await attachEmail(sessionId, gate);
  }
  return { sessionId, vault, day: todayStamp() };
}
