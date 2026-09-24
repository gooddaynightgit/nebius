/** Jasmine's rotating first-look openers. Pair with "you" only when it fits. */
export const EXCAVATE_OPENERS = [
  "Ahh",
  "Ooh-la-la",
  "Mmm",
  "Oho",
  "Aha",
  "Wowee",
  "Ooo",
  "Huh",
  "Oh my",
  "Gosh",
] as const;

export const HUMBLE_CLOSERS = [
  "Wanted to confirm I read that correctly?",
  "Checking that I understood it properly?",
  "Did I interpret that accurately?",
  "Am I seeing this correctly?",
  "Can you verify I got that right?",
  "Making certain I didn't misread it?",
  "Was my take on that correct?",
  "Confirming I caught that the way it was meant?",
  "Did I get the right impression there?",
  "Hoping to double-check what I saw?",
] as const;

function slot(key: string, modulo: number): number {
  let n = 0;
  for (let i = 0; i < key.length; i += 1) {
    n = (n + key.charCodeAt(i) * (i + 1)) % 2147483647;
  }
  return Math.abs(n) % modulo;
}

/** Surprise opener for a personal-photo first look. Varies with the key. */
export function rotatingOpener(key = "still"): string {
  const safe = key.trim() || "still";
  return EXCAVATE_OPENERS[slot(safe, EXCAVATE_OPENERS.length)];
}

/** Keep a model closer when it is already one of the listed lines; otherwise end on a rotating one. */
export function withHumbleCloser(text: string, key = "still"): string {
  let body = text.replace(/\s+/g, " ").trim();
  if (!body || /^block\.?$/i.test(body)) return body;
  const lower = body.toLowerCase();
  if (HUMBLE_CLOSERS.some((line) => lower.endsWith(line.toLowerCase()))) return body;
  body = body.replace(/\s+[^.!?]*\?\s*$/, "").replace(/[.!\s]+$/, "");
  const closer = HUMBLE_CLOSERS[slot(`${key}:check`, HUMBLE_CLOSERS.length)];
  return body ? `${body}. ${closer}` : closer;
}
