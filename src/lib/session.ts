import { cookies } from "next/headers";
import { randomUUID } from "node:crypto";
import { isValidEmail, normalizeEmail, todayStamp } from "./identity";
import {
  attachEmail,
  capturesForDay,
  getOrCreateAnonVault,
  lastStoryForDay,
  appPhotoForDay,
  isYoursOpened,
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

export function toPublicSession(
  vault: VaultRecord,
  sessionId: string,
  day: string,
): SessionState {
  const today = capturesForDay(vault, day);
  const todayPhoto = appPhotoForDay(vault, day);
  const opened = isYoursOpened(vault, day);
  return {
    sessionId,
    vaultId: vault.id,
    email: vault.email ?? null,
    captureCount: vault.captures.length,
    todayCount: today.length,
    canHearStory: opened,
    lastStory: lastStoryForDay(vault, day),
    todayPhoto,
    yoursOpened: opened,
    canReplacePhoto: Boolean(todayPhoto) && !opened,
  };
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
