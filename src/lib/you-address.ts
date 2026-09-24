/** One address per story. The model is given only the phrase this picker returns. */
export const YOU_ADDRESSES = [
  "Remarkable you",
  "Incredible you",
  "Fantastic you",
  "Brilliant you",
  "Marvelous you",
  "Splendid you",
  "Extraordinary you",
  "Phenomenal you",
  "Magnificent you",
  "Wonderful you",
  "Spectacular you",
  "Amazing you",
  "Outstanding you",
  "Exceptional you",
  "Stunning you",
  "Dazzling you",
  "Superb you",
  "Impressive you",
  "Sensational you",
  "Terrific you",
] as const;

function slot(key: string, modulo: number): number {
  let n = 0;
  for (let i = 0; i < key.length; i += 1) {
    n = (n + key.charCodeAt(i) * (i + 1)) % 2147483647;
  }
  return Math.abs(n) % modulo;
}

/** Same seeding idea as rotatingOpener: one story key, one stable phrase. */
export function youAddressFor(key = "still"): string {
  const safe = key.trim() || "still";
  return YOU_ADDRESSES[slot(safe, YOU_ADDRESSES.length)];
}

/** Swap a leftover "perfect you" for this story's address, then clear any remaining perfect. */
export function withoutPerfectYou(text: string, key = "still"): string {
  const phrase = youAddressFor(key);
  const adjective = phrase.replace(/ you$/i, "");
  const addressed = text.replace(/\bperfect\s*,?\s*you\b/gi, phrase);
  return addressed.replace(/\bperfect\b/gi, adjective);
}
