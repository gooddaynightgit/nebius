export const HUMBLE_CLOSERS = [
  "Just making sure I saw that right?",
  "Anything wrong?",
  "Did I get this right?",
  "Does that look right to you?",
  "Am I seeing this right?",
] as const;

function closerSlot(key: string): number {
  let n = 0;
  for (let i = 0; i < key.length; i += 1) {
    n = (n + key.charCodeAt(i) * (i + 1)) % 2147483647;
  }
  return Math.abs(n) % HUMBLE_CLOSERS.length;
}

/** Keep a model closer when it is already one of the five; otherwise end on a rotating one. */
export function withHumbleCloser(text: string, key = "still"): string {
  let body = text.replace(/\s+/g, " ").trim();
  if (!body || /^block\.?$/i.test(body)) return body;
  const lower = body.toLowerCase();
  if (HUMBLE_CLOSERS.some((line) => lower.endsWith(line.toLowerCase()))) return body;
  body = body.replace(/\s+[^.!?]*\?\s*$/, "").replace(/[.!\s]+$/, "");
  const closer = HUMBLE_CLOSERS[closerSlot(`${key}:check`)];
  return body ? `${body}. ${closer}` : closer;
}
