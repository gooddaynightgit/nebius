import { YOU_ADDRESSES } from "./you-address";

export const APP_STORY_MIN = 60;
export const APP_STORY_TARGET_MIN = 120;
export const APP_STORY_TARGET_MAX = 520;
export const APP_STORY_MAX = 900;
export const APP_STORY_WORD_MIN = 12;
export const APP_STORY_WORD_MAX = 70;
export const APP_STORY_WORD_HARD_MAX = 85;
export const APP_STORY_SENTENCE_MAX = 4;

export const WEAVE_BLOCKED =
  "Tonight isn’t a story for My good moment. This picture isn’t one we can tell. Keep the night gentle.";

export const APP_STORY_WELLNESS_RE =
  /\b(serotonin|circadian|oxytocin|endorphin|endorphins)\b/i;

const EMPTY_REFLECTION =
  "Today, you kept a small good from the day, lovely, bright, and wonderful. Fantastic, you hunted one good moment today, and the hunting became your happiness, your joy.";

const HUNT_CLOSE =
  "Fantastic, you hunted one good moment today, and the hunting became your happiness, your joy.";

const QUIET_OPEN_RE = /^(today,\s+you|yes,\s+you|you\b)/i;

export const APP_STORY_LEAK_RE =
  /nothing else|never more|not a lecture|not a list|do not have to|don't have to|no one else|without adding|only the whisper|kept what the frame|beside the image sits|will not invent|this telling will not|not a pep talk|not a moral|no extra line beside|\bexcavations?\b|\bexcavates?\b|joy pick|nightly reflection|four beats|photo description|optional caption|their whisper|your whisper/i;

export function leaksAppStoryInstruction(body: string): boolean {
  return APP_STORY_LEAK_RE.test(body);
}

export function countAppStoryWords(text: string): number {
  return text.replace(/\s+/g, " ").trim().split(" ").filter(Boolean).length;
}

export function countAppStorySentences(text: string): number {
  return text
    .replace(/\s+/g, " ")
    .trim()
    .split(/(?<=[.!?])(?:\s+|$)/)
    .map((part) => part.trim())
    .filter(Boolean).length;
}

export function isWeaveBlock(text: string): boolean {
  const cleaned = text
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .replace(/```(?:\w+)?/g, "")
    .replace(/[`"'“”*]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return /^block\.?$/i.test(cleaned);
}

export function normalizeAppStory(text: string): string {
  let body = text.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
  body = body.replace(/^```(?:\w+)?\s*|\s*```$/g, "").trim();
  body = body.replace(/^title:\s*.*$/gim, "");
  body = body.replace(/#[\p{L}\p{N}_]+/gu, "");
  body = body.replace(/\p{Extended_Pictographic}/gu, "");
  body = body.replace(/\n{3,}/g, "\n\n").replace(/[ \t]+\n/g, "\n");
  body = body.replace(/[ \t]{2,}/g, " ").trim();
  return body;
}

function splitSentences(text: string): string[] {
  return text
    .replace(/\s+/g, " ")
    .trim()
    .split(/(?<=[.!?])\s+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function clipToWordCap(text: string, maxWords: number): string {
  const words = text.replace(/\s+/g, " ").trim().split(" ").filter(Boolean);
  if (words.length <= maxWords) return words.join(" ");
  const clipped = words.slice(0, maxWords).join(" ");
  const lastStop = Math.max(
    clipped.lastIndexOf(". "),
    clipped.lastIndexOf("! "),
    clipped.lastIndexOf("? "),
  );
  if (lastStop >= 24) return clipped.slice(0, lastStop + 1).trim();
  return /[.!?]$/.test(clipped) ? clipped : `${clipped.replace(/[,:;]+$/, "")}.`;
}

export function trimAppStory(body: string, max = APP_STORY_MAX): string {
  let text = body.replace(/\s+/g, " ").trim();
  const sentences = splitSentences(text);
  if (sentences.length > APP_STORY_SENTENCE_MAX) {
    text = sentences.slice(0, APP_STORY_SENTENCE_MAX).join(" ").trim();
  }
  text = clipToWordCap(text, APP_STORY_WORD_HARD_MAX);
  if (text.length <= max) return text;
  const slice = text.slice(0, max);
  const lastStop = Math.max(
    slice.lastIndexOf(". "),
    slice.lastIndexOf("! "),
    slice.lastIndexOf("? "),
    slice.lastIndexOf(".\n"),
  );
  if (lastStop >= APP_STORY_MIN) {
    return slice.slice(0, lastStop + 1).trim();
  }
  return slice.trim();
}

function softenPunctuation(text: string): string {
  const next = text.replace(/\?+/g, ".").replace(/\s+/g, " ").trim();
  const firstBang = next.indexOf("!");
  if (firstBang < 0) return next;
  const firstStop = next.search(/[.!?]/);
  const keep = firstStop === firstBang;
  let seen = false;
  return next.replace(/!+/g, () => {
    if (keep && !seen) {
      seen = true;
      return "!";
    }
    return ".";
  });
}

function ensureQuietOpen(text: string): string {
  const trimmed = text.replace(/\s+/g, " ").trim();
  if (!trimmed) return EMPTY_REFLECTION;
  if (QUIET_OPEN_RE.test(trimmed)) return trimmed;
  const rest = trimmed.replace(/[.!?]+$/, "");
  return `Today, you ${rest.charAt(0).toLowerCase()}${rest.slice(1)}.`;
}

function hasBrandClose(text: string): boolean {
  const lower = text.toLowerCase();
  const addressed =
    YOU_ADDRESSES.some((phrase) => lower.includes(phrase.toLowerCase())) ||
    /\b(fantastic|wonderful|beautiful|yes), you\b/i.test(text);
  return (
    addressed &&
    /hunted one good moment today|found one good moment today|becoming someone who looks/i.test(text)
  );
}

/** One soft exclamation on the opening is welcome. Questions and extra bangs are not. */
export function hasLecturePunctuation(body: string): boolean {
  if (/\?/.test(body)) return true;
  const bangs = body.match(/!/g);
  if (!bangs) return false;
  if (bangs.length > 1) return true;
  const firstStop = body.search(/[.!?]/);
  return firstStop < 0 || body[firstStop] !== "!";
}

export function expandAppStory(body: string, min = APP_STORY_MIN): string {
  let next = softenPunctuation(body);
  if (!next) next = EMPTY_REFLECTION;
  next = ensureQuietOpen(next);
  if (!/[.!?]$/.test(next)) next = `${next}.`;
  const needsMore =
    next.length < min || countAppStoryWords(next) < APP_STORY_WORD_MIN;
  if (needsMore && countAppStorySentences(next) < APP_STORY_SENTENCE_MAX && !hasBrandClose(next)) {
    next = `${next} ${HUNT_CLOSE}`;
  }
  return trimAppStory(next);
}

export function finishAppStory(body: string): string {
  return trimAppStory(expandAppStory(body));
}

export function stripPlaybackQuotes(template: string): string {
  return template.replace(/^[\s"'“”]+|[\s"'“”]+$/g, "").trim();
}

export const CANNED_PLAYBACK_MARKERS = [
  "Ten quiet minutes. Gold on your skin",
  "You turned yourself ON",
  "fully, radiantly, joyfully there",
  "That's not a small thing. That's everything",
  "Your space is brighter. And so are you",
  "too alive for categories",
  "Endorphins like fireworks",
  "breathtakingly, beautifully — with you in it",
] as const;

export function usesCannedPlayback(body: string, template: string): boolean {
  const hay = body.replace(/\s+/g, " ");
  const raw = stripPlaybackQuotes(template);
  if (raw.length >= 32 && hay.includes(raw.slice(0, 32))) return true;
  if (raw.length >= 48 && hay.includes(raw.slice(-48))) return true;
  for (const marker of CANNED_PLAYBACK_MARKERS) {
    if (hay.includes(marker)) return true;
  }
  const sentences = raw
    .split(/(?<=\.)\s+/)
    .map((part) => part.trim())
    .filter((part) => part.length >= 28);
  return sentences.some((sentence) => hay.includes(sentence));
}

export function celebratesDespair(text: string): boolean {
  return /no\s*one cares about me|nobody cares about me|nobody loves me|i(?:'m| am) worthless/i.test(
    text,
  );
}

export function appStoryProblems(body: string, template: string): string[] {
  const problems: string[] = [];
  const words = countAppStoryWords(body);
  const sentences = countAppStorySentences(body);
  if (body.length < APP_STORY_MIN || words < APP_STORY_WORD_MIN) problems.push("short");
  if (
    body.length > APP_STORY_MAX ||
    words > APP_STORY_WORD_HARD_MAX ||
    sentences > APP_STORY_SENTENCE_MAX
  ) {
    problems.push("long");
  }
  if (usesCannedPlayback(body, template)) problems.push("canned");
  if (APP_STORY_WELLNESS_RE.test(body)) problems.push("wellness");
  if (celebratesDespair(body)) problems.push("despair");
  if (leaksAppStoryInstruction(body)) problems.push("leak");
  if (hasLecturePunctuation(body)) problems.push("lecture");
  if (/^title:/im.test(body)) problems.push("title");
  if (/#\w/.test(body) || /\p{Extended_Pictographic}/u.test(body)) problems.push("chrome");
  return problems;
}

export function parseAppWeaveReply(text: string): "BLOCK" | string {
  if (isWeaveBlock(text)) return "BLOCK";
  const body = normalizeAppStory(text);
  if (isWeaveBlock(body)) return "BLOCK";
  return body;
}
