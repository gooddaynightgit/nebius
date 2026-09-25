import { maskClosingLines } from "./affirmation";

/**
 * Words and phrases that talk a kept moment down, plus negative words.
 * Matched as whole words, case-insensitive, including common inflections.
 * Dark, grey, and alone stay out of this list on purpose.
 */
export const DIMINISHING_PHRASES = [
  "unremarkable",
  "mundane",
  "ordinary",
  "nothing special",
  "insignificant",
  "boring",
  "theft",
  "thief",
  "steal",
  "stole",
  "stolen",
  "stealing",
  "sneak",
  "sneaky",
  "guilty",
  "guilt",
  "sin",
  "sinful",
  "naughty",
  "forbidden",
  "cheat",
  "imperfect",
  "flawed",
  "flaw",
  "messy",
  "broken",
  "sad",
  "sadness",
  "lonely",
  "tired",
  "exhausted",
  "lost",
  "empty",
  "waste",
  "wasted",
  "regret",
  "pain",
  "hurt",
  "fear",
  "afraid",
  "worry",
  "lack",
  "missing",
  "bad",
  "wrong",
  "ugly",
  "fail",
  "failure",
] as const;

const BANNED =
  /\b(?:thefts|theft|thieves|thief|stealing|stolen|stole|steals|steal|sneaking|sneaked|snuck|sneaky|sneaks|sneak|guilty|guilt|sinfully|sinful|sins|sin|naughty|forbidden|cheating|cheated|cheats|cheat|imperfectly|imperfect|flawed|flaws|flaw|messy|broken|sadness|sadly|sad|lonely|tired|exhausted|lost|empty|wasting|wasted|wastes|waste|regretting|regretted|regrets|regret|painful|pains|pain|hurting|hurts|hurt|fearing|feared|fears|fear|afraid|worrying|worried|worries|worry|lacking|lacked|lacks|lack|missing|badly|bad|wrong|ugly|failing|failed|fails|fail|failures|failure|unremarkable|mundane|ordinary|nothing special|insignificant|boring)\b/i;

const STOP = new Set([
  "about",
  "after",
  "a",
  "an",
  "and",
  "as",
  "at",
  "be",
  "because",
  "been",
  "before",
  "being",
  "but",
  "by",
  "for",
  "from",
  "i",
  "if",
  "in",
  "into",
  "is",
  "it",
  "me",
  "my",
  "of",
  "on",
  "or",
  "over",
  "so",
  "than",
  "that",
  "the",
  "then",
  "these",
  "this",
  "those",
  "to",
  "was",
  "were",
  "when",
  "while",
  "with",
]);

function withCase(match: string, replacement: string): string {
  if (match === match.toUpperCase() && /[A-Z]/.test(match)) return replacement.toUpperCase();
  const first = match.charAt(0);
  if (first === first.toUpperCase() && first !== first.toLowerCase()) {
    return replacement.charAt(0).toUpperCase() + replacement.slice(1);
  }
  return replacement;
}

function articleFor(article: string | undefined, noun: string): string {
  if (!article) return "";
  if (/^an$/i.test(article) && !/^[aeiou]/i.test(noun)) {
    return article.charAt(0) === "A" ? "A" : "a";
  }
  return article;
}

/** Adjective phrases such as "just as it is" sit after the noun so the sentence still reads. */
function shiftPhrase(text: string, word: string, phrase: string): string {
  const re = new RegExp(`\\b(?:(an|a|the)\\s+)?(${word})(?:\\s+([A-Za-z][A-Za-z'-]*))?`, "gi");
  return text.replace(re, (full, article: string | undefined, wordToken: string, next: string | undefined) => {
    const phraseOut = withCase(wordToken, phrase);
    if (next && !STOP.has(next.toLowerCase())) {
      const art = articleFor(article, next);
      return `${art ? `${art} ` : ""}${next} ${phraseOut}`;
    }
    const art = article ? `${article} ` : "";
    const tail = next ? ` ${next}` : "";
    return `${art}${phraseOut}${tail}`;
  });
}

const SWAPS: Array<{ pattern: RegExp; replacement: string }> = [
  { pattern: /\bperfectly unremarkable\b/gi, replacement: "perfectly mine" },
  { pattern: /\bsweet thefts\b/gi, replacement: "sweet gifts" },
  { pattern: /\bsweet theft\b/gi, replacement: "sweet gift" },
  { pattern: /\bguilty pleasures\b/gi, replacement: "quiet joys" },
  { pattern: /\bguilty pleasure\b/gi, replacement: "quiet joy" },
  { pattern: /\bstolen moments\b/gi, replacement: "gifted moments" },
  { pattern: /\bstolen moment\b/gi, replacement: "gifted moment" },
  { pattern: /\ba lack of\b/gi, replacement: "a wealth of" },
  { pattern: /\bno regrets\b/gi, replacement: "only joy" },
  { pattern: /\bafraid of\b/gi, replacement: "at peace with" },
  { pattern: /\bworried about\b/gi, replacement: "glad about" },
  { pattern: /\blost in\b/gi, replacement: "held in" },
  { pattern: /\bmy fears\b/gi, replacement: "my trust" },
  { pattern: /\bher fears\b/gi, replacement: "her trust" },
  { pattern: /\bthe fears\b/gi, replacement: "the trust" },
  { pattern: /\ba waste\b/gi, replacement: "a gift" },
  { pattern: /\bunremarkable\b/gi, replacement: "precious" },
  { pattern: /\bmundane\b/gi, replacement: "dear" },
  { pattern: /\bordinary\b/gi, replacement: "dear" },
  { pattern: /\bnothing special\b/gi, replacement: "worth keeping" },
  { pattern: /\binsignificant\b/gi, replacement: "precious" },
  { pattern: /\bboring\b/gi, replacement: "dear" },
  { pattern: /\bthefts\b/gi, replacement: "gifts" },
  { pattern: /\btheft\b/gi, replacement: "gift" },
  { pattern: /\bthieves\b/gi, replacement: "dear ones" },
  { pattern: /\bthief\b/gi, replacement: "dear one" },
  { pattern: /\bstealing\b/gi, replacement: "savouring" },
  { pattern: /\bstolen\b/gi, replacement: "gifted" },
  { pattern: /\bstole\b/gi, replacement: "savoured" },
  { pattern: /\bsteals\b/gi, replacement: "savours" },
  { pattern: /\bsteal\b/gi, replacement: "savour" },
  { pattern: /\bsneaking\b/gi, replacement: "quietly keeping" },
  { pattern: /\bsneaked\b/gi, replacement: "kept" },
  { pattern: /\bsnuck\b/gi, replacement: "kept" },
  { pattern: /\bsneaky\b/gi, replacement: "quiet" },
  { pattern: /\bsneaks\b/gi, replacement: "keeps" },
  { pattern: /\bsneak\b/gi, replacement: "keep" },
  { pattern: /\bguilty\b/gi, replacement: "glad" },
  { pattern: /\bguilt\b/gi, replacement: "gladness" },
  { pattern: /\bsinfully\b/gi, replacement: "wonderfully" },
  { pattern: /\bsinful\b/gi, replacement: "wonderful" },
  { pattern: /\bsins\b/gi, replacement: "joys" },
  { pattern: /\bsin\b/gi, replacement: "joy" },
  { pattern: /\bnaughty\b/gi, replacement: "delightful" },
  { pattern: /\bforbidden\b/gi, replacement: "welcome" },
  { pattern: /\bcheating\b/gi, replacement: "treating" },
  { pattern: /\bcheated\b/gi, replacement: "treated" },
  { pattern: /\bcheats\b/gi, replacement: "treats" },
  { pattern: /\bcheat\b/gi, replacement: "treat" },
  { pattern: /\bflawed\b/gi, replacement: "dear" },
  { pattern: /\bflaws\b/gi, replacement: "beauties" },
  { pattern: /\bflaw\b/gi, replacement: "beauty" },
  { pattern: /\bmessy\b/gi, replacement: "soft" },
  { pattern: /\bbroken\b/gi, replacement: "whole" },
  { pattern: /\bsadness\b/gi, replacement: "gladness" },
  { pattern: /\bsadly\b/gi, replacement: "gladly" },
  { pattern: /\bsad\b/gi, replacement: "glad" },
  { pattern: /\blonely\b/gi, replacement: "peaceful" },
  { pattern: /\btired\b/gi, replacement: "rested" },
  { pattern: /\bexhausted\b/gi, replacement: "rested" },
  { pattern: /\blost\b/gi, replacement: "found" },
  { pattern: /\bempty\b/gi, replacement: "open" },
  { pattern: /\bwasting\b/gi, replacement: "savouring" },
  { pattern: /\bwasted\b/gi, replacement: "savoured" },
  { pattern: /\bwastes\b/gi, replacement: "savours" },
  { pattern: /\bwaste\b/gi, replacement: "savour" },
  { pattern: /\bregretting\b/gi, replacement: "cherishing" },
  { pattern: /\bregretted\b/gi, replacement: "cherished" },
  { pattern: /\bregrets\b/gi, replacement: "cherishes" },
  { pattern: /\bregret\b/gi, replacement: "cherish" },
  { pattern: /\bpainful\b/gi, replacement: "gentle" },
  { pattern: /\bpains\b/gi, replacement: "ease" },
  { pattern: /\bpain\b/gi, replacement: "ease" },
  { pattern: /\bhurting\b/gi, replacement: "easing" },
  { pattern: /\bhurts\b/gi, replacement: "eases" },
  { pattern: /\bhurt\b/gi, replacement: "eased" },
  { pattern: /\bfearing\b/gi, replacement: "trusting" },
  { pattern: /\bfeared\b/gi, replacement: "trusted" },
  { pattern: /\bfears\b/gi, replacement: "trusts" },
  { pattern: /\bfear\b/gi, replacement: "trust" },
  { pattern: /\bworrying\b/gi, replacement: "trusting" },
  { pattern: /\bworries\b/gi, replacement: "trusts" },
  { pattern: /\bworry\b/gi, replacement: "trust" },
  { pattern: /\blacking\b/gi, replacement: "full" },
  { pattern: /\blacked\b/gi, replacement: "held" },
  { pattern: /\blacks\b/gi, replacement: "holds" },
  { pattern: /\black\b/gi, replacement: "plenty" },
  { pattern: /\bmissing\b/gi, replacement: "kept" },
  { pattern: /\bbadly\b/gi, replacement: "well" },
  { pattern: /\bbad\b/gi, replacement: "good" },
  { pattern: /\bwrong\b/gi, replacement: "right" },
  { pattern: /\bugly\b/gi, replacement: "lovely" },
  { pattern: /\bfailing\b/gi, replacement: "thriving" },
  { pattern: /\bfailed\b/gi, replacement: "thrived" },
  { pattern: /\bfails\b/gi, replacement: "thrives" },
  { pattern: /\bfailures\b/gi, replacement: "gifts" },
  { pattern: /\bfailure\b/gi, replacement: "gift" },
  { pattern: /\bfail\b/gi, replacement: "thrive" },
];

export function hasDiminishingPhrase(text: string): boolean {
  return BANNED.test(maskClosingLines(text).text);
}

/** Last resort after one regenerate: the banned phrase never stays in the text. */
export function stripDiminishingPhrases(text: string): string {
  const masked = maskClosingLines(text);
  let next = masked.text;
  for (const swap of SWAPS) {
    next = next.replace(swap.pattern, (match) => withCase(match, swap.replacement));
  }
  next = shiftPhrase(next, "imperfect(?:ly)?", "just as it is");
  next = shiftPhrase(next, "afraid", "at peace");
  next = shiftPhrase(next, "worried", "at peace");
  next = next.replace(/\ban (?=[bcdfghjklmnpqrstvwxyz])/gi, (match) =>
    match.charAt(0) === "A" ? "A " : "a ",
  );
  next = next.replace(/\b(?:an|a)\s+(?=at peace\b|just as it is\b)/gi, "");
  next = next.replace(/[ \t]{2,}/g, " ").trim();
  return masked.restore(next);
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
