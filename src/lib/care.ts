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
  [/\bidoing\b/gi, "I doing"],
  [/\bhowami\b/gi, "how am I"],
  [/\breachedout\b/gi, "reached out"],
  [/\bfindout\b/gi, "find out"],
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
  /no\s*one\s*care|nobody\s*care|noone\s*care|nobody loves me|no\s*one loves me|no\s*one likes me|nobody likes me|i(?:'m| am) (?:so |really |very )?(?:alone|lonely|worthless|unlovable|unloved|useless|a failure)|i feel (?:so |really |very )?(?:sad|alone|lonely|empty|worthless|unloved)|i (?:hate|don't like) myself|i don'?t matter|nothing matters|hate my life|i(?:'m| am) (?:so |really |very )?(?:sad|unhappy|depressed|miserable)\b|want to die|kill myself|no one (?:thinks|asks) about me/i;

const CONCRETE_GOOD_RE =
  /\b(?:friend|happy|glad|joy|smile|laugh|enquir|check(?:ed)? in|contacted|texted|someone cares about me)\b/i;

export function cleanSpokenLine(value: string | undefined): string {
  if (!value?.trim()) return "";
  let next = value.replace(/\s+/g, " ").trim();
  for (const [pattern, replacement] of TYPOS) {
    next = next.replace(pattern, (match) => preserveCase(replacement, match));
  }
  next = next.replace(/\bi\b/g, "I");
  next = next.replace(/\bhow am I doing\b/gi, "how am I doing");
  next = next.replace(/\s+([,.!?])/g, "$1");
  next = next.replace(/\s+/g, " ").trim();
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

export function containsDespair(value: string | undefined): boolean {
  if (!value?.trim()) return false;
  const folded = foldForSense(value);
  return DESPAIR_RE.test(folded);
}

function foldForSense(value: string): string {
  return value
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase()
    .replace(/aboute/g, "about")
    .replace(/noone/g, "no one")
    .replace(/caresabout/g, "cares about");
}

export function isSelfNegating(value: string | undefined): boolean {
  if (!containsDespair(value)) return false;
  const folded = foldForSense(value ?? "");
  if (CONCRETE_GOOD_RE.test(folded) && !/no\s*one\s*care|nobody\s*care|noone\s*care/i.test(folded)) {
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
