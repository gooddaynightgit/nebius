import { hasTokenFactoryKey } from "./config";
import { getJoyById, JOY_TYPES } from "./landing";
import {
  appStoryVisionModels,
  completeWithFallback,
  stripReasoning,
  uniqueModels,
  visionModels,
  type ChatMessage,
} from "./nebius";

/** Verbatim witness core. Category names here follow Jasmine’s list. */
export const JOY_MATCH_CORE = `You are the witness inside GoodDayNight, an app that trains people to notice one good moment a day.

You will receive a photo and the joy category the user picked for it.

Your job: decide if the photo plausibly matches the category. Be generous — moments are subjective and the user is always the final authority. Only flag a mismatch when the photo clearly shows something unrelated (e.g. they picked "morning sunlight" but the photo shows a rainy car wiper).

If it matches (or is close enough), respond with exactly: MATCH

If it clearly doesn't match, respond in this exact format:
MISMATCH | [one short line: what you actually see, then a humble suggestion of a better-fitting category from this list: Morning sunlight / A hello / One thing done slowly / A little movement / One corner clear / A sound you stopped for / Someone else's good moment / No name for it]

Tone rules for the mismatch line:
- Under 20 words
- State what you see plainly, no judgment
- Suggest with "feels more like... to me" — humble, never authoritative
- Never say "wrong", "incorrect", or "actually"
- Warm, quiet, like a friend leaning over`;

/** Core prompt plus mismatch examples. Screenshots are not an automatic hello. */
export const JOY_MATCH_SYSTEM = `${JOY_MATCH_CORE}

Clear cases — stay generous when a moment is borderline, and do not rubber-stamp a scene that is unrelated:
- MATCH "A hello" when the image clearly shows a greeting: a text thread, a hello bubble, a gift message, a wave, a laugh with someone, or their name in a message. A screenshot may be that hello.
- MISMATCH "A hello" for a generic UI screenshot, a settings screen, random app chrome, a home screen, or any photo with no greeting, wave, message, or laugh-with-someone. A screen print is not automatically a hello.
- Use that same bar for every category. When the scene and the picked joy are clearly unrelated, answer MISMATCH and suggest a better fit from the list with "feels more like... to me".

Examples:
Joy picked: A hello. Photo: a phone settings screen, toggles, no message.
MISMATCH | A settings screen with toggles — feels more like no name for it to me.
Joy picked: A hello. Photo: a text thread that says hello.
MATCH
Joy picked: Morning sunlight. Photo: rain on a window and a wiper.
MISMATCH | Rain on the glass and a wiper — feels more like no name for it to me.

The whole reply is one line: MATCH, or MISMATCH | followed by the short line. No preamble.`;

export type JoyMatchResult =
  | { kind: "match" }
  | { kind: "mismatch"; line: string; suggestedJoyId: string | null }
  | { kind: "unavailable" }
  | { kind: "need-photo" };

/** Vision ids YOURS already uses, then the image2text closer if vision throws. */
export function joyMatchModels(): string[] {
  return uniqueModels(...visionModels(), ...appStoryVisionModels());
}

function normalizeCategory(value: string): string {
  return value
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/,/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Map a witness suggestion onto a joy id. Prompt names and UI titles both count. */
export function suggestJoyId(line: string): string | null {
  const haystack = normalizeCategory(line);
  const titled = [...JOY_TYPES].sort((a, b) => b.title.length - a.title.length);
  for (const joy of titled) {
    if (haystack.includes(normalizeCategory(joy.title))) return joy.id;
  }
  return null;
}

function cleanVerdictLine(line: string): string {
  let cleaned = line.trim().replace(/^`+|`+$/g, "").trim();
  cleaned = cleaned.replace(/^\*\*(.+)\*\*$/, "$1").trim();
  cleaned = cleaned.replace(/^[-*•]\s+/, "").trim();
  return cleaned;
}

/**
 * First verdict line wins: a line that is `MATCH`, or `MISMATCH | …`.
 * A preamble before that line is ignored. Anything else fails open as MATCH
 * so a messy model reply never blocks the night.
 */
export function parseJoyMatch(raw: string): JoyMatchResult {
  const text = stripReasoning(raw)
    .replace(/```[a-z]*\n?/gi, "")
    .trim();
  if (!text) return { kind: "match" };
  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i += 1) {
    const cleaned = cleanVerdictLine(lines[i] ?? "");
    if (!cleaned) continue;
    if (/^match$/i.test(cleaned)) return { kind: "match" };
    const inline = cleaned.match(/^mismatch\s*\|\s*(.*)$/i);
    if (!inline) continue;
    const parts = [inline[1]?.trim() ?? ""];
    if (!parts[0] || !/feels more like/i.test(parts[0])) {
      for (let j = i + 1; j < lines.length; j += 1) {
        const next = cleanVerdictLine(lines[j] ?? "");
        if (!next) break;
        if (/^match$/i.test(next) || /^mismatch\s*\|/i.test(next)) break;
        parts.push(next);
        if (/feels more like/i.test(parts.join(" "))) break;
      }
    }
    const line = parts.filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
    if (!line) continue;
    return { kind: "mismatch", line, suggestedJoyId: suggestJoyId(line) };
  }
  return { kind: "match" };
}

export function applyJoyMatchChoice(input: {
  choice: "switch" | "keep";
  currentJoyId: string;
  suggestedJoyId: string | null;
}): { joyId: string; openCaption: true } {
  if (input.choice === "switch") {
    const suggested = getJoyById(input.suggestedJoyId);
    if (suggested) return { joyId: suggested.id, openCaption: true };
  }
  return { joyId: input.currentJoyId, openCaption: true };
}

export async function witnessJoyMatch(input: {
  joyTitle: string;
  imageDataUrl: string;
  complete?: typeof completeWithFallback;
}): Promise<JoyMatchResult> {
  if (!input.imageDataUrl) return { kind: "need-photo" };
  if (!input.complete && !hasTokenFactoryKey()) return { kind: "unavailable" };
  const complete = input.complete ?? completeWithFallback;
  try {
    const userContent: ChatMessage["content"] = [
      {
        type: "text",
        text: `Joy picked: ${input.joyTitle}\nA screen print matches only when it clearly shows that joy. For A hello, that means a greeting, text thread, hello bubble, wave, or laugh with someone. A settings screen, generic app chrome, article, spreadsheet, or home screen is MISMATCH.\nReply with one line only: MATCH, or MISMATCH | what you see, then feels more like ... to me.\nPhoto:`,
      },
      { type: "image_url", image_url: { url: input.imageDataUrl } },
    ];
    const result = await complete(
      joyMatchModels(),
      [
        { role: "system", content: JOY_MATCH_SYSTEM },
        { role: "user", content: userContent },
      ],
      { temperature: 0, maxTokens: 160 },
    );
    return parseJoyMatch(result.text);
  } catch {
    return { kind: "match" };
  }
}
