/**
 * Clean up what the browser's speech recognition hears.
 *
 * Android Chrome often re-sends everything said so far inside each new result, and people
 * repeat themselves when they restart a thought. These helpers merge pieces without doubling them.
 */

const norm = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^\p{L}\p{N}' ]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

const words = (s: string) => s.trim().split(/\s+/).filter(Boolean);

/** Join `next` onto `acc`, skipping anything `next` repeats from `acc`. */
export function mergeSpeech(acc: string, next: string): string {
  const a = acc.trim();
  const b = next.trim();
  if (!a) return b;
  if (!b) return a;
  const na = norm(a);
  const nb = norm(b);
  if (!nb) return a;
  if (nb.startsWith(na)) return b; // next already contains everything so far
  if (na.includes(nb)) return a; // nothing new
  // Largest overlap: end of acc == start of next
  const aw = words(a);
  const bw = words(b);
  const an = aw.map(norm);
  const bn = bw.map(norm);
  for (let k = Math.min(an.length, bn.length); k > 0; k -= 1) {
    if (an.slice(-k).join(" ") === bn.slice(0, k).join(" ")) {
      return [...aw, ...bw.slice(k)].join(" ");
    }
  }
  return `${a} ${b}`;
}

/** Remove a phrase said twice in a row: "I'd love I'd love to be free" -> "I'd love to be free". */
export function collapseRepeats(text: string): string {
  let w = words(text);
  let changed = true;
  while (changed) {
    changed = false;
    const n = w.map(norm);
    outer: for (let len = Math.floor(n.length / 2); len >= 2; len -= 1) {
      for (let i = 0; i + 2 * len <= n.length; i += 1) {
        if (n.slice(i, i + len).join(" ") === n.slice(i + len, i + 2 * len).join(" ")) {
          w = [...w.slice(0, i + len), ...w.slice(i + 2 * len)];
          changed = true;
          break outer;
        }
      }
    }
  }
  return w.join(" ");
}

/** Merge a list of recognition results (finals and the latest interim) into clean text. */
export function cleanSpeech(parts: string[], base = ""): string {
  return collapseRepeats(parts.reduce((acc, p) => mergeSpeech(acc, p), base));
}
