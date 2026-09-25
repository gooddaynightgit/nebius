/** One address per story. The model is given only the phrase this picker returns. */
export const YOU_ADDRESSES = [
  "Remarkable me",
  "Incredible me",
  "Fantastic me",
  "Brilliant me",
  "Marvelous me",
  "Splendid me",
  "Extraordinary me",
  "Phenomenal me",
  "Magnificent me",
  "Wonderful me",
  "Spectacular me",
  "Amazing me",
  "Outstanding me",
  "Exceptional me",
  "Stunning me",
  "Dazzling me",
  "Superb me",
  "Impressive me",
  "Sensational me",
  "Terrific me",
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
  const adjective = phrase.replace(/ (?:you|me)$/i, "");
  const addressed = text.replace(/\bperfect\s*,?\s*(?:you|me)\b/gi, phrase);
  return addressed.replace(/\bperfect\b/gi, adjective);
}
