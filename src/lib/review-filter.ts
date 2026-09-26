/**
 * Blocks profanity, insults, slurs, and abusive language before a review is kept.
 * Matching allows repeated letters, leet digits, and symbols standing in for a letter (f*ck, sh1t).
 * A hit must be its own word, so ordinary words that merely contain the letters still pass.
 */

const SUFFIX = "(?:ity|ing|ers|er|ed|es|s)?";
const SEP = "[^a-z0-9*#]*";

const WORDS = [
  "fuck",
  "fock",
  "motherfucker",
  "motherfuck",
  "fucker",
  "clusterfuck",
  "shit",
  "shitty",
  "bullshit",
  "shithead",
  "dipshit",
  "bitch",
  "bitchy",
  "ass",
  "asshole",
  "asshat",
  "badass",
  "dumbass",
  "jackass",
  "bastard",
  "cunt",
  "dick",
  "dickhead",
  "cock",
  "cocksucker",
  "piss",
  "whore",
  "slut",
  "bollocks",
  "wanker",
  "twat",
  "prick",
  "douche",
  "douchebag",
  "idiot",
  "idiotic",
  "stupid",
  "moron",
  "imbecile",
  "pathetic",
  "loser",
  "suck",
  "trash",
  "garbage",
  "kys",
  "stfu",
  "wtf",
  "nigger",
  "nigga",
  "faggot",
  "fag",
  "dyke",
  "tranny",
  "retard",
  "spic",
  "kike",
  "chink",
  "wetback",
  "coon",
  "gook",
  "beaner",
];

const PHRASES = ["kill yourself", "go die"];

function letterSlot(ch: string): string {
  if (ch === "f") return "(?:f+|ph+|[\\*#])";
  if (ch === "u") return "(?:[uv]+|[\\*#])";
  return `(?:${ch}+|[\\*#])`;
}

function wordBody(word: string): string {
  return [...word].map(letterSlot).join(SEP);
}

function wordPattern(word: string): RegExp {
  return new RegExp(`(?:^|[^a-z0-9])${wordBody(word)}${SUFFIX}(?=$|[^a-z0-9])`, "i");
}

function phrasePattern(phrase: string): RegExp {
  const body = phrase.split(" ").map(wordBody).join("[^a-z0-9]+");
  return new RegExp(`(?:^|[^a-z0-9])${body}(?=$|[^a-z0-9])`, "i");
}

const PATTERNS = [...WORDS.map(wordPattern), ...PHRASES.map(phrasePattern)];

export function normalizeKindness(raw: string): string {
  return raw
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[@4]/g, "a")
    .replace(/3/g, "e")
    .replace(/[1!|]/g, "i")
    .replace(/0/g, "o")
    .replace(/[$5]/g, "s")
    .replace(/[7+]/g, "t")
    .replace(/8/g, "b")
    .replace(/9/g, "g");
}

export function isUnkindReview(comment: string, name: string): boolean {
  const text = normalizeKindness(`${comment}\n${name}`);
  return PATTERNS.some((pattern) => pattern.test(text));
}
