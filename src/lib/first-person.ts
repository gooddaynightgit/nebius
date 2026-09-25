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
  "thank",
  "thanks",
  "thanked",
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

/**
 * Turn a story paragraph into first person.
 * Subject you → I, object you → me, your → my, yours → mine, yourself → myself.
 * A sign-off such as "Magnificent you" becomes "Magnificent me".
 */
export function toFirstPersonStory(text: string): string {
  if (!text || !hasSecondPerson(text)) return text;
  let next = text;
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
  return next;
}

/** On-screen story text. Stored paragraphs are left as they were saved. */
export function displayStoryText(text: string): string {
  return toFirstPersonStory(text);
}
