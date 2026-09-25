import { toFirstPersonStory } from "./first-person";

/** Eight closes. Straight apostrophe, en dash with spaces. One is saved on each new keepsake. */
export const KEEPSAKE_CLOSING_LINES = [
  "I love this moment. It's beautiful \u2013 the joy and awe of being.",
  "I treasure this moment. It's radiant \u2013 the wonder and delight of being.",
  "I cherish this moment. It's luminous \u2013 the joy and marvel of being.",
  "I adore this moment. It's glorious \u2013 the awe and gladness of being.",
  "I hold this moment close. It's lovely \u2013 the wonder and joy of being.",
  "I embrace this moment. It's breathtaking \u2013 the joy and awe of simply being.",
  "I savour this moment. It's exquisite \u2013 the delight and wonder of being.",
  "I love this moment. It's gorgeous \u2013 the quiet joy and awe of being.",
] as const;

const OLD_AFFIRMATION =
  "I (?:love|treasure|cherish|adore|hold dear) this moment\\. It(?:'s|\u2019s| is) (?:beautiful|radiant|luminous|glorious|brilliant)\\. I (?:forgive|let go|release|make peace)\\. I am (?:courageous|brave|fearless|bold|strong)\\.";

function flexible(line: string): string {
  return line
    .replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    .replace(/'/g, "['\u2019]")
    .replace(/ \u2013 /g, "\\s*[\u2013\u2014-]\\s*");
}

const LIST_SOURCE = KEEPSAKE_CLOSING_LINES.map(flexible).join("|");

const TRAILING_CLOSE = new RegExp(
  `(?:\\s*\\n\\s*\\n\\s*|\\s+)(?:${OLD_AFFIRMATION}|${LIST_SOURCE})\\s*$`,
  "i",
);

function hashIndex(storyId: string): number {
  const key = storyId.trim() || "still";
  let hash = 2166136261;
  for (let i = 0; i < key.length; i += 1) {
    hash ^= key.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) % KEEPSAKE_CLOSING_LINES.length;
}

/** Stable close for a saved story that does not already end on a list line. */
export function closingLineForStory(storyId: string): string {
  return KEEPSAKE_CLOSING_LINES[hashIndex(storyId)] ?? KEEPSAKE_CLOSING_LINES[0];
}

export function pickClosingLine(random: () => number = Math.random): string {
  const index = Math.min(
    KEEPSAKE_CLOSING_LINES.length - 1,
    Math.floor(random() * KEEPSAKE_CLOSING_LINES.length),
  );
  return KEEPSAKE_CLOSING_LINES[index] ?? KEEPSAKE_CLOSING_LINES[0];
}

/** The list line already on this text, in canonical spelling, if any. */
export function keptClosingLine(text: string): string | null {
  const trimmed = text.trimEnd();
  for (const line of KEEPSAKE_CLOSING_LINES) {
    const re = new RegExp(`(?:\\n\\n|\\s+)${flexible(line)}\\s*$`, "i");
    if (re.test(trimmed)) return line;
  }
  return null;
}

/** Drop a model-written affirmation or a copy of any list line. */
export function stripTrailingClosing(text: string): string {
  let next = text;
  for (let pass = 0; pass < 4; pass += 1) {
    const stripped = next.replace(TRAILING_CLOSE, "").trimEnd();
    if (stripped === next) break;
    next = stripped;
  }
  return next;
}

/** Weaving story, then exactly one blank line, then a chosen close. */
export function withClosingLine(body: string, random: () => number = Math.random): string {
  const story = stripTrailingClosing(body).trimEnd();
  return `${story}\n\n${pickClosingLine(random)}`;
}

export function splitKeepsakeClosing(text: string): { story: string; closing: string } {
  const closing = keptClosingLine(text);
  if (!closing) return { story: text, closing: "" };
  const at = text.lastIndexOf(closing);
  if (at < 0) return { story: text, closing: "" };
  return { story: text.slice(0, at).trimEnd(), closing };
}

/**
 * On-screen keepsake. A line already from the list stays.
 * An old four-sentence close is replaced by a line chosen from the story id.
 */
export function displayKeepsakeText(text: string, storyId = ""): string {
  const first = toFirstPersonStory(text);
  const kept = keptClosingLine(first);
  const story = stripTrailingClosing(first).trimEnd();
  const closing = kept ?? closingLineForStory(storyId);
  return `${story}\n\n${closing}`;
}
