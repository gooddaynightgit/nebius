/** Phrases that talk a kept moment down. Matched as whole words, case-insensitive. */
export const DIMINISHING_PHRASES = [
  "unremarkable",
  "mundane",
  "ordinary",
  "nothing special",
  "insignificant",
  "boring",
] as const;

const SWAPS: Array<{ pattern: RegExp; replacement: string }> = [
  { pattern: /\bperfectly unremarkable\b/gi, replacement: "perfectly mine" },
  { pattern: /\bunremarkable\b/gi, replacement: "precious" },
  { pattern: /\bmundane\b/gi, replacement: "dear" },
  { pattern: /\bordinary\b/gi, replacement: "dear" },
  { pattern: /\bnothing special\b/gi, replacement: "worth keeping" },
  { pattern: /\binsignificant\b/gi, replacement: "precious" },
  { pattern: /\bboring\b/gi, replacement: "dear" },
];

function withCase(match: string, replacement: string): string {
  if (match === match.toUpperCase() && /[A-Z]/.test(match)) return replacement.toUpperCase();
  const first = match.charAt(0);
  if (first === first.toUpperCase() && first !== first.toLowerCase()) {
    return replacement.charAt(0).toUpperCase() + replacement.slice(1);
  }
  return replacement;
}

export function hasDiminishingPhrase(text: string): boolean {
  return DIMINISHING_PHRASES.some((phrase) => new RegExp(`\\b${phrase}\\b`, "i").test(text));
}

/** Last resort after one regenerate: the banned phrase never stays in the text. */
export function stripDiminishingPhrases(text: string): string {
  let next = text;
  for (const swap of SWAPS) {
    next = next.replace(swap.pattern, (match) => withCase(match, swap.replacement));
  }
  next = next.replace(/\ban (?=precious\b|dear\b|worth\b)/gi, (match) =>
    match.charAt(0) === "A" ? "A " : "a ",
  );
  return next.replace(/[ \t]{2,}/g, " ").trim();
}

/**
 * If the draft talks the moment down, ask once more. If that draft still does,
 * replace the phrase so the reader never sees it.
 */
export async function settleDiminishingText(
  text: string,
  regenerate?: () => Promise<string | null | undefined>,
): Promise<string> {
  if (!hasDiminishingPhrase(text)) return text;
  let next = text;
  if (regenerate) {
    try {
      const again = (await regenerate())?.trim();
      if (again) next = again;
    } catch {
      next = text;
    }
  }
  return hasDiminishingPhrase(next) ? stripDiminishingPhrases(next) : next;
}
