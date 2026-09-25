import { toFirstPersonStory } from "./first-person";

/** One fixed close on every keepsake. Straight apostrophe, en dash with spaces. */
export const KEEPSAKE_CLOSING_LINE =
  "I love this moment. It's beautiful \u2013 the joy and awe of being.";

const OLD_AFFIRMATION =
  "I (?:love|treasure|cherish|adore|hold dear) this moment\\. It(?:'s|\u2019s| is) (?:beautiful|radiant|luminous|glorious|brilliant)\\. I (?:forgive|let go|release|make peace)\\. I am (?:courageous|brave|fearless|bold|strong)\\.";

const CLOSING_COPY =
  "I love this moment\\. It(?:'s|\u2019s) beautiful\\s*[\u2013\u2014-]\\s*the joy and awe of being\\.";

const TRAILING_CLOSE = new RegExp(
  `(?:\\s*\\n\\s*\\n\\s*|\\s+)(?:${OLD_AFFIRMATION}|${CLOSING_COPY})\\s*$`,
  "i",
);

/** Drop a model-written affirmation or a copy of the fixed closing line. */
export function stripTrailingClosing(text: string): string {
  let next = text;
  for (let pass = 0; pass < 4; pass += 1) {
    const stripped = next.replace(TRAILING_CLOSE, "").trimEnd();
    if (stripped === next) break;
    next = stripped;
  }
  return next;
}

/** Weaving story, then exactly one blank line, then the fixed close. */
export function withClosingLine(body: string): string {
  const story = stripTrailingClosing(body).trimEnd();
  return `${story}\n\n${KEEPSAKE_CLOSING_LINE}`;
}

export function splitKeepsakeClosing(text: string): { story: string; closing: string } {
  const marker = `\n\n${KEEPSAKE_CLOSING_LINE}`;
  if (text.endsWith(marker)) {
    return { story: text.slice(0, -marker.length), closing: KEEPSAKE_CLOSING_LINE };
  }
  return { story: text, closing: "" };
}

/**
 * On-screen keepsake. First person, then the fixed close.
 * A saved story that still ends on the old four-sentence line shows this line instead.
 */
export function displayKeepsakeText(text: string): string {
  return withClosingLine(toFirstPersonStory(text));
}
