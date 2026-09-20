import { createHash, randomUUID } from "node:crypto";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function newId(prefix: string): string {
  return `${prefix}_${randomUUID().replace(/-/g, "").slice(0, 20)}`;
}

export function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

export function isValidEmail(raw: string): boolean {
  const email = normalizeEmail(raw);
  return email.length > 3 && email.length < 254 && EMAIL_RE.test(email);
}

export function todayStamp(now = new Date(), timeZone?: string): string {
  if (timeZone) {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(now);
  }
  return now.toISOString().slice(0, 10);
}

export function hashEmail(email: string): string {
  return createHash("sha256").update(normalizeEmail(email)).digest("hex").slice(0, 24);
}

export function anonVaultId(sessionId: string): string {
  return `anon_${sessionId}`;
}

export function emailVaultId(email: string): string {
  return `em_${hashEmail(email)}`;
}

export function canUnlockStory(captureCount: number, email: string | null): boolean {
  return captureCount >= 1 && Boolean(email);
}

export function canPromptEmail(captureCount: number, email: string | null): boolean {
  return captureCount >= 1 && !email;
}
