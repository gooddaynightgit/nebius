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

export type SparkVoice = {
  openerIndex: number;
  closerIndex: number;
  opener: string;
  closer: string;
};

const SPARK_VOICE_STORAGE_KEY = "gooddaynight.sparkVoice";

/** Extra leading interjections the model reaches for beside the listed sparks. */
const EXTRA_OPENERS = ["Ooh", "Oh", "Wow", "Whoa", "Oooh", "Hey", "Yay", "Ah"] as const;

function inRange(index: number | null | undefined, length: number): index is number {
  return typeof index === "number" && Number.isInteger(index) && index >= 0 && index < length;
}

function pickAvoiding(length: number, avoid: number | null | undefined, random: () => number): number {
  if (length <= 1) return 0;
  const blocked = inRange(avoid, length) ? avoid : null;
  const roll = random();
  let index = Math.floor(roll * length);
  if (index < 0) index = 0;
  if (index >= length) index = length - 1;
  if (blocked === null || index !== blocked) return index;
  const span = length - 1;
  let shift = 1 + Math.floor(random() * span);
  if (shift < 1) shift = 1;
  if (shift > span) shift = span;
  return (blocked + shift) % length;
}

/**
 * One opener and one closer for this first look.
 * Random, and never the index this user was shown last time.
 */
export function chooseSparkVoice(
  previous?: { openerIndex?: number | null; closerIndex?: number | null } | null,
  random: () => number = Math.random,
): SparkVoice {
  const openerIndex = pickAvoiding(EXCAVATE_OPENERS.length, previous?.openerIndex, random);
  const closerIndex = pickAvoiding(HUMBLE_CLOSERS.length, previous?.closerIndex, random);
  return {
    openerIndex,
    closerIndex,
    opener: EXCAVATE_OPENERS[openerIndex],
    closer: HUMBLE_CLOSERS[closerIndex],
  };
}

function openerLeadPattern(): RegExp {
  const words = [...EXCAVATE_OPENERS, ...EXTRA_OPENERS]
    .slice()
    .sort((a, b) => b.length - a.length)
    .map((word) => word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  return new RegExp(`^(?:${words.join("|")})(?:\\s+you)?\\s*[!.,…]+\\s*`, "i");
}

function stripKnownCloser(text: string): string {
  let body = text;
  for (let i = 0; i < 2; i += 1) {
    const lower = body.toLowerCase();
    const closer = HUMBLE_CLOSERS.find((line) => lower.endsWith(line.toLowerCase()));
    if (!closer) break;
    body = body.slice(0, body.length - closer.length).replace(/[\s.!?…]+$/, "").trim();
  }
  return body;
}

/** Drop a model opener and any trailing confirm question so the chosen pair can be fitted. */
export function stripSparkFrame(text: string): string {
  let body = text.replace(/\s+/g, " ").trim();
  const lead = openerLeadPattern();
  for (let i = 0; i < 3; i += 1) {
    const next = body.replace(lead, "");
    if (next === body) break;
    body = next.trim();
  }
  body = stripKnownCloser(body);
  const split = body.match(/^(.*[.!]["']?)\s+([^.!?]+\?["']?)$/);
  if (split) body = split[1].trim();
  else if (
    /\?["']?\s*$/.test(body) &&
    /confirm|checking|interpret|seeing this|verify|misread|correctly|impression|double-check|understood|got that right/i.test(
      body,
    )
  ) {
    body = body.replace(/\s*[^.!?]+\?\s*$/, "").trim();
  }
  return body.replace(/[\s.!?…]+$/, "").trim();
}

function asSentence(middle: string): string {
  const trimmed = middle.replace(/^[\s,;:]+/, "").trim();
  const base = trimmed || "This still from the day";
  const cased = base.charAt(0).toUpperCase() + base.slice(1);
  return /[.!?…]["']?$/.test(cased) ? cased : `${cased}.`;
}

/** Prepend the chosen opener and append the chosen closer, replacing anything the model wrote. */
export function applySparkVoice(text: string, voice: { opener: string; closer: string }): string {
  const body = text.replace(/\s+/g, " ").trim();
  if (!body || /^block\.?$/i.test(body)) return body;
  return `${voice.opener}! ${asSentence(stripSparkFrame(body))} ${voice.closer}`;
}

/** Last opener and closer this browser was shown. */
export function readSparkVoiceMemory(): { openerIndex: number; closerIndex: number } | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(SPARK_VOICE_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { openerIndex?: unknown; closerIndex?: unknown };
    if (!inRange(parsed.openerIndex as number, EXCAVATE_OPENERS.length)) return null;
    if (!inRange(parsed.closerIndex as number, HUMBLE_CLOSERS.length)) return null;
    return { openerIndex: parsed.openerIndex as number, closerIndex: parsed.closerIndex as number };
  } catch {
    return null;
  }
}

export function writeSparkVoiceMemory(voice: { openerIndex: number; closerIndex: number }): void {
  if (typeof localStorage === "undefined") return;
  if (!inRange(voice.openerIndex, EXCAVATE_OPENERS.length)) return;
  if (!inRange(voice.closerIndex, HUMBLE_CLOSERS.length)) return;
  localStorage.setItem(
    SPARK_VOICE_STORAGE_KEY,
    JSON.stringify({ openerIndex: voice.openerIndex, closerIndex: voice.closerIndex }),
  );
}

/** Replace both ends. A closer already on the list is not left in place. */
export function withHumbleCloser(text: string, key = "still"): string {
  const safe = key.trim() || "still";
  return applySparkVoice(text, {
    opener: rotatingOpener(safe),
    closer: HUMBLE_CLOSERS[slot(`${safe}:check`, HUMBLE_CLOSERS.length)],
  });
}
