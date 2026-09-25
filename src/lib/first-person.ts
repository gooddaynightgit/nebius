import { YOU_ADDRESSES } from "./you-address";

/** Standalone second-person words. Not youth, bayou, or your inside another word. */
export const SECOND_PERSON_RE = /\b(you|your|yours|yourself)\b/i;

const ADDRESS_ADJECTIVES = new Set(
  YOU_ADDRESSES.map((phrase) => phrase.split(/\s+/)[0].toLowerCase()),
);
ADDRESS_ADJECTIVES.add("perfect");

const CLAUSE = new Set([
  "and",
  "but",
  "or",
  "so",
  "then",
  "when",
  "because",
  "while",
  "if",
  "as",
  "that",
  "which",
  "who",
  "today",
  "yes",
  "now",
  "once",
  "still",
  "here",
  "there",
  "how",
  "where",
  "until",
  "although",
  "though",
  "since",
  "whenever",
]);

const PREPOSITIONS = new Set([
  "to",
  "for",
  "with",
  "from",
  "of",
  "about",
  "at",
  "on",
  "in",
  "into",
  "onto",
  "upon",
  "toward",
  "towards",
  "around",
  "over",
  "under",
  "behind",
  "beside",
  "between",
  "without",
  "within",
  "through",
  "across",
  "against",
  "among",
  "amongst",
  "by",
  "than",
  "via",
  "near",
  "past",
  "plus",
  "off",
  "up",
  "down",
  "out",
  "after",
  "before",
  "like",
]);

const AMBIGUOUS_PREP = new Set(["after", "before", "like", "as"]);

const OBJECT_VERBS = new Set([
  "held",
  "hold",
  "holds",
  "holding",
  "saw",
  "see",
  "sees",
  "seen",
  "seeing",
  "found",
  "find",
  "finds",
  "finding",
  "kept",
  "keep",
  "keeps",
  "keeping",
  "noticed",
  "notice",
  "gave",
  "give",
  "gives",
  "giving",
  "told",
  "tell",
  "made",
  "make",
  "makes",
  "making",
  "let",
  "lets",
  "letting",
  "loved",
  "love",
  "felt",
  "feel",
  "brought",
  "left",
  "leave",
  "met",
  "knew",
  "know",
  "helped",
  "showed",
  "show",
  "reached",
  "touched",
  "changed",
  "changing",
  "caught",
  "named",
  "called",
  "watched",
  "wanted",
  "needed",
  "heard",
  "missed",
  "hugged",
]);

const VERBISH =
  /(?:ed|ing)$|^(left|kept|held|found|gave|made|saw|felt|was|were|am|are|is|had|have|did|do|paused|stood|laughed|waved|moved|noticed|caught|stayed|turned|walked|named|looked|went|came|ran|sat|ate|said|told|knew|thought|let|got|took|hunted|stopped|built|meant|exist|wasn|weren|didn|don|isn)$/i;

export function hasSecondPerson(text: string): boolean {
  return SECOND_PERSON_RE.test(text);
}

function cased(match: string, replacement: string): string {
  if (match === match.toUpperCase() && /[A-Z]/.test(match)) return replacement.toUpperCase();
  if (match[0] === match[0].toUpperCase() && match[0] !== match[0].toLowerCase()) {
    return replacement.charAt(0).toUpperCase() + replacement.slice(1);
  }
  return replacement;
}

function meLike(match: string): string {
  if (match === match.toUpperCase()) return "ME";
  if (match[0] === match[0].toUpperCase()) return "Me";
  return "me";
}

function apply(text: string, pattern: string, replacement: string): string {
  return text.replace(new RegExp(pattern, "gi"), (match) => cased(match, replacement));
}

function nextWord(after: string): string {
  return /^\s*([A-Za-z'’]+)/.exec(after)?.[1] ?? "";
}

function youIsObject(before: string, after: string): boolean {
  const found = /([A-Za-z'’]+)([^A-Za-z'’]*)$/.exec(before);
  if (!found) return false;
  const prev = found[1];
  const between = found[2];
  if (/[.!?]/.test(between)) return false;
  const key = prev.toLowerCase();
  const next = nextWord(after).toLowerCase();
  if (ADDRESS_ADJECTIVES.has(key)) {
    if (between.includes(",") && next) return false;
    return true;
  }
  if (CLAUSE.has(key)) return false;
  if (PREPOSITIONS.has(key)) {
    if (AMBIGUOUS_PREP.has(key) && next && VERBISH.test(next)) return false;
    return true;
  }
  if (OBJECT_VERBS.has(key) || /(?:ed|ing)$/i.test(key)) return true;
  return false;
}

const LETTER = /[A-Za-z]/;

/** A straight apostrophe inside a word (`you're`, `I'm`), not a quotation mark. */
function isApostrophe(text: string, index: number): boolean {
  return LETTER.test(text[index - 1] ?? "") && LETTER.test(text[index + 1] ?? "");
}

/** Opening quotation mark, and the character that closes it. Apostrophes are not quotes. */
function openingQuote(text: string, index: number): string | null {
  const ch = text[index];
  if (ch === '"') return '"';
  if (ch === "\u201C") return "\u201D";
  if (ch === "\u2018") return "\u2019";
  if (ch === "'") {
    if (isApostrophe(text, index)) return null;
    const prev = text[index - 1] ?? "";
    if (LETTER.test(prev) || /\d/.test(prev)) return null;
    return "'";
  }
  return null;
}

function findClose(text: string, from: number, closer: string): number {
  for (let i = from; i < text.length; i += 1) {
    if (text[i] !== closer) continue;
    if (closer === "'" && isApostrophe(text, i)) continue;
    return i;
  }
  return -1;
}

/** Keep quoted speech and “thank you” out of the pronoun swap. */
function shieldFixedPhrases(text: string): { text: string; slots: string[] } {
  const slots: string[] = [];
  const keep = (chunk: string) => {
    const token = `\uE000${slots.length}\uE001`;
    slots.push(chunk);
    return token;
  };

  let shielded = "";
  for (let i = 0; i < text.length; ) {
    const closer = openingQuote(text, i);
    if (closer) {
      const end = findClose(text, i + 1, closer);
      if (end !== -1) {
        shielded += keep(text.slice(i, end + 1));
        i = end + 1;
        continue;
      }
    }
    shielded += text[i];
    i += 1;
  }

  shielded = shielded.replace(/\bthank[ -]you\b/gi, (match) => keep(match));
  // This close speaks to the moment as "you". Leave that address as written.
  shielded = shielded.replace(
    /I['’]m so glad you found me, you beautiful moment\./gi,
    (match) => keep(match),
  );
  return { text: shielded, slots };
}

function restoreSlots(text: string, slots: string[]): string {
  return text.replace(/\uE000(\d+)\uE001/g, (_match, index: string) => slots[Number(index)] ?? "");
}

/**
 * Turn a story paragraph into first person.
 * Subject you → I, object you → me, your → my, yours → mine, yourself → myself.
 * A sign-off such as "Magnificent you" becomes "Magnificent me".
 * Quoted speech is left as written. "thank you" and "thank-you" stay put.
 */
export function toFirstPersonStory(text: string): string {
  if (!text || !hasSecondPerson(text)) return text;
  const shielded = shieldFixedPhrases(text);
  let next = shielded.text;
  next = apply(next, "\\byourself\\b", "myself");
  next = apply(next, "\\byours\\b", "mine");
  next = apply(next, "\\byour\\b", "my");
  next = apply(next, "\\byou['’]re\\b", "I'm");
  next = apply(next, "\\byou['’]ve\\b", "I've");
  next = apply(next, "\\byou['’]ll\\b", "I'll");
  next = apply(next, "\\byou['’]d\\b", "I'd");
  next = apply(next, "\\byou aren['’]t\\b", "I'm not");
  next = apply(next, "\\byou weren['’]t\\b", "I wasn't");
  next = apply(next, "\\byou haven['’]t\\b", "I haven't");
  next = apply(next, "\\byou hadn['’]t\\b", "I hadn't");
  next = apply(next, "\\byou don['’]t\\b", "I don't");
  next = apply(next, "\\byou didn['’]t\\b", "I didn't");
  next = apply(next, "\\byou can['’]t\\b", "I can't");
  next = apply(next, "\\byou cannot\\b", "I cannot");
  next = apply(next, "\\byou won['’]t\\b", "I won't");
  next = apply(next, "\\byou wouldn['’]t\\b", "I wouldn't");
  next = apply(next, "\\byou couldn['’]t\\b", "I couldn't");
  next = apply(next, "\\byou shouldn['’]t\\b", "I shouldn't");
  next = apply(next, "\\byou are not\\b", "I am not");
  next = apply(next, "\\byou were not\\b", "I was not");
  next = apply(next, "\\byou have not\\b", "I have not");
  next = apply(next, "\\byou did not\\b", "I did not");
  next = apply(next, "\\byou do not\\b", "I do not");
  next = apply(next, "\\byou will not\\b", "I will not");
  next = apply(next, "\\byou are\\b", "I am");
  next = apply(next, "\\byou were\\b", "I was");
  next = apply(next, "\\byou have\\b", "I have");
  next = apply(next, "\\byou had\\b", "I had");
  next = apply(next, "\\byou do\\b", "I do");
  next = apply(next, "\\byou did\\b", "I did");
  next = apply(next, "\\byou will\\b", "I will");
  next = apply(next, "\\byou would\\b", "I would");
  next = apply(next, "\\byou can\\b", "I can");
  next = apply(next, "\\byou could\\b", "I could");
  next = apply(next, "\\byou should\\b", "I should");
  next = apply(next, "\\bso are you\\b", "so am I");
  next = apply(next, "\\bare you\\b", "am I");
  next = apply(next, "\\bwere you\\b", "was I");
  next = next.replace(/\byou\b/gi, (match, offset, whole) => {
    const before = whole.slice(0, offset);
    const after = whole.slice(offset + match.length);
    return youIsObject(before, after) ? meLike(match) : "I";
  });
  return restoreSlots(next, shielded.slots);
}

/** On-screen story text. Stored paragraphs are left as they were saved. */
export function displayStoryText(text: string): string {
  return toFirstPersonStory(text);
}
