const LOVE = ["love", "treasure", "cherish", "adore", "hold dear"] as const;
const BEAUTY = ["beautiful", "radiant", "luminous", "glorious", "brilliant"] as const;
const FORGIVE = ["I forgive", "I let go", "I release", "I make peace"] as const;
const COURAGE = ["courageous", "brave", "fearless", "bold", "strong"] as const;

const LOVE_RE = LOVE.join("|");
const BEAUTY_RE = BEAUTY.join("|");
const FORGIVE_RE = "forgive|let go|release|make peace";
const COURAGE_RE = COURAGE.join("|");

/** Four short sentences: love this moment, it is beautiful, I forgive, I am courageous. */
export const AFFIRMATION_LINE_SOURCE = `I (?:${LOVE_RE}) this moment\\. It(?:'s|’s| is) (?:${BEAUTY_RE})\\. I (?:${FORGIVE_RE})\\. I am (?:${COURAGE_RE})\\.`;

export const AFFIRMATION_LINE_RE = new RegExp(AFFIRMATION_LINE_SOURCE, "i");

function pick<T>(list: readonly T[], random: () => number): T {
  const index = Math.min(list.length - 1, Math.floor(random() * list.length));
  return list[index] ?? list[0];
}

/** One varied affirmation line. The four meanings stay in order. */
export function affirmationLine(random: () => number = Math.random): string {
  return `I ${pick(LOVE, random)} this moment. It's ${pick(BEAUTY, random)}. ${pick(FORGIVE, random)}. I am ${pick(COURAGE, random)}.`;
}

/** Drop a model-written copy of the affirmation so the app can add its own. */
export function stripTrailingAffirmation(text: string): string {
  const trailing = new RegExp(`(?:\\s*\\n\\s*\\n\\s*|\\s+)${AFFIRMATION_LINE_SOURCE}\\s*$`, "i");
  return text.replace(trailing, "").trimEnd();
}

/** Weaving story, then a skipped line, then the affirmation. The line is extra. */
export function withAffirmationLine(body: string, random: () => number = Math.random): string {
  const story = stripTrailingAffirmation(body).trimEnd();
  return `${story}\n\n${affirmationLine(random)}`;
}

export function splitWeavedAffirmation(text: string): { story: string; affirmation: string } {
  const trailing = new RegExp(`\\n\\n(${AFFIRMATION_LINE_SOURCE})\\s*$`, "i");
  const match = text.match(trailing);
  if (!match || match.index === undefined) return { story: text, affirmation: "" };
  return { story: text.slice(0, match.index).trimEnd(), affirmation: match[1] ?? "" };
}
