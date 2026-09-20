/** Light read-aloud cleanup and compassionate silver linings. */

const TYPOS: Array<[RegExp, string]> = [
  [/\bfreind\b/gi, "friend"],
  [/\bfriand\b/gi, "friend"],
  [/\bhapppy\b/gi, "happy"],
  [/\bhapy\b/gi, "happy"],
  [/\bhappyness\b/gi, "happiness"],
  [/\benquiered\b/gi, "enquired"],
  [/\benquiried\b/gi, "enquired"],
  [/\benquried\b/gi, "enquired"],
  [/\bcontaced\b/gi, "contacted"],
  [/\bcontected\b/gi, "contacted"],
  [/\bcareing\b/gi, "caring"],
  [/\bsomeon\b/gi, "someone"],
  [/\bsomeonee\b/gi, "someone"],
  [/\bnobdy\b/gi, "nobody"],
  [/\bnoone\b/gi, "no one"],
  [/\balonse\b/gi, "alone"],
  [/\blonly\b/gi, "lonely"],
  [/\blonley\b/gi, "lonely"],
  [/\brecieved\b/gi, "received"],
  [/\bbecuase\b/gi, "because"],
  [/\bdefinately\b/gi, "definitely"],
  [/\bseperate\b/gi, "separate"],
  [/\btommorow\b/gi, "tomorrow"],
  [/\bwoudl\b/gi, "would"],
  [/\bteh\b/gi, "the"],
  [/\badn\b/gi, "and"],
  [/\bwaht\b/gi, "what"],
  [/\baboutt\b/gi, "about"],
  [/\baboute\b/gi, "about"],
  [/\bdoung\b/gi, "doing"],
  [/\bdooing\b/gi, "doing"],
  [/\bdoign\b/gi, "doing"],
  [/\bdiong\b/gi, "doing"],
  [/\bdonig\b/gi, "doing"],
  [/\bidoing\b/gi, "I'm doing"],
  [/\bim\b/gi, "I'm"],
  [/\bi'm\b/g, "I'm"],
  [/\bive\b/gi, "I've"],
  [/\bdont\b/gi, "don't"],
  [/\bdoesnt\b/gi, "doesn't"],
  [/\bcant\b/gi, "can't"],
  [/\bwont\b/gi, "won't"],
  [/\bthats\b/gi, "that's"],
  [/\bwhats\b/gi, "what's"],
  [/\byoure\b/gi, "you're"],
  [/\btheyre\b/gi, "they're"],
];

const DESPAIR_RE =
  /no\s*one cares|nobody cares|noone cares|nobody loves me|no\s*one loves me|no\s*one likes me|nobody likes me|i(?:'m| am) (?:so |really |very )?(?:alone|lonely|worthless|unlovable|unloved|useless|a failure)|i feel (?:so |really |very )?(?:sad|alone|lonely|empty|worthless|unloved)|i (?:hate|don't like) myself|i don'?t matter|nothing matters|hate my life|i(?:'m| am) (?:so |really |very )?(?:sad|unhappy|depressed|miserable)\b|want to die|kill myself|no one (?:thinks|asks) about me/i;

const CONCRETE_GOOD_RE =
  /\b(?:friend|happy|glad|joy|smile|laugh|enquir|check(?:ed)? in|contacted|texted|someone cares about me)\b/i;

export function cleanSpokenLine(value: string | undefined): string {
  if (!value?.trim()) return "";
  let next = value.replace(/\s+/g, " ").trim();
  for (const [pattern, replacement] of TYPOS) {
    next = next.replace(pattern, (match) => preserveCase(replacement, match));
  }
  next = next.replace(/\bi\b/g, "I");
  next = next.replace(/\s+([,.!?])/g, "$1");
  return next.replace(/^[a-z]/, (ch) => ch.toUpperCase());
}

function preserveCase(replacement: string, original: string): string {
  if (original === original.toUpperCase() && original.length > 1) {
    return replacement.toUpperCase();
  }
  if (original[0] === original[0].toUpperCase()) {
    return replacement.replace(/^[a-z]/, (ch) => ch.toUpperCase());
  }
  return replacement;
}

export function isSelfNegating(value: string | undefined): boolean {
  if (!value?.trim()) return false;
  const text = value.replace(/\s+/g, " ").trim();
  if (!DESPAIR_RE.test(text)) return false;
  if (CONCRETE_GOOD_RE.test(text) && !/no\s*one cares|nobody cares|noone cares/i.test(text)) {
    return false;
  }
  return true;
}

export function isSilverLiningLine(value: string | undefined): boolean {
  if (!value) return false;
  return /silver lining|heart loves connection|wish to be cared|naming the (?:wish|loneliness)/i.test(
    value,
  );
}

export const DEFAULT_SILVER_LINING =
  "Naming the wish to be cared for is already a silver lining — your heart loves connection, and that wish is how care begins.";

export function silverLiningFor(value: string): string {
  const text = value.toLowerCase();
  if (/alone|lonely|loneliness/.test(text)) {
    return "Naming the loneliness is already a silver lining — a heart that loves connection can begin to notice care.";
  }
  if (/worthless|unlovable|unloved|don't matter|dont matter|useless|failure/.test(text)) {
    return "The wish to matter is already a silver lining — you are someone a caring world can hold, worthy of belonging.";
  }
  if (/sad|unhappy|depressed|miserable|hate my life|hate myself/.test(text)) {
    return "Naming a heavy feeling is already a silver lining — a heart that can name the cloud is reaching toward light.";
  }
  return DEFAULT_SILVER_LINING;
}

export type StoryMoment = {
  line: string;
  reframed: boolean;
};

export function prepareSpoken(input: {
  text?: string;
  transcript?: string;
  caption?: string;
}): string {
  return cleanSpokenLine(input.transcript || input.caption || input.text || "");
}

export type SpellProposal = {
  original: string;
  corrected: string;
  changed: boolean;
};

const COMMON_WORDS = new Set(
  [
    "doing",
    "about",
    "friend",
    "friends",
    "happy",
    "happiness",
    "enquired",
    "enquired",
    "inquired",
    "someone",
    "somebody",
    "cares",
    "care",
    "caring",
    "reached",
    "reach",
    "find",
    "found",
    "today",
    "tonight",
    "because",
    "really",
    "think",
    "thought",
    "little",
    "quiet",
    "laugh",
    "smile",
    "smiled",
    "texted",
    "contacted",
    "checked",
    "asking",
    "asked",
    "worth",
    "worthy",
    "lonely",
    "alone",
    "nobody",
    "nothing",
    "myself",
    "people",
    "person",
    "grateful",
    "glad",
    "joy",
    "love",
    "loved",
    "lovely",
    "morning",
    "evening",
    "how",
    "am",
  ].map((word) => word.toLowerCase()),
);

function levenshtein(a: string, b: string): number {
  const rows = a.length + 1;
  const cols = b.length + 1;
  const grid = Array.from({ length: rows }, () => Array<number>(cols).fill(0));
  for (let i = 0; i < rows; i += 1) grid[i][0] = i;
  for (let j = 0; j < cols; j += 1) grid[0][j] = j;
  for (let i = 1; i < rows; i += 1) {
    for (let j = 1; j < cols; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      grid[i][j] = Math.min(
        grid[i - 1][j] + 1,
        grid[i][j - 1] + 1,
        grid[i - 1][j - 1] + cost,
      );
    }
  }
  return grid[a.length][b.length];
}

function closestCommonWord(word: string): string | null {
  const lower = word.toLowerCase();
  if (lower.length < 4 || COMMON_WORDS.has(lower)) return null;
  let best: string | null = null;
  let bestDistance = 99;
  let ties = 0;
  for (const candidate of COMMON_WORDS) {
    const max = candidate.length <= 4 ? 1 : 2;
    const distance = levenshtein(lower, candidate);
    if (distance === 0 || distance > max) continue;
    if (distance < bestDistance) {
      best = candidate;
      bestDistance = distance;
      ties = 1;
    } else if (distance === bestDistance && candidate !== best) {
      ties += 1;
    }
  }
  return ties === 1 ? best : null;
}

function fuzzyCorrectWords(value: string): string {
  return value.replace(/[A-Za-z']+/g, (word) => {
    const match = closestCommonWord(word);
    if (!match) return word;
    return preserveCase(match, word);
  });
}

export function proposeSpokenLine(value: string | undefined): SpellProposal {
  const original = (value ?? "").replace(/\s+/g, " ").trim();
  if (!original) return { original: "", corrected: "", changed: false };
  const corrected = fuzzyCorrectWords(cleanSpokenLine(original));
  return {
    original,
    corrected,
    changed: original !== corrected,
  };
}

export function chooseSpokenLine(
  original: string,
  decision: "corrected" | "keep" | "none" | string | undefined,
  corrected = proposeSpokenLine(original).corrected,
): string {
  if (decision === "keep") return original.replace(/\s+/g, " ").trim();
  if (decision === "corrected") return corrected;
  return original.replace(/\s+/g, " ").trim();
}
