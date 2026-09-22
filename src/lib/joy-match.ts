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

/** Verbatim witness prompt. Category names here follow Jasmine’s list. */
export const JOY_MATCH_SYSTEM = `You are the witness inside Gooddaynight, an app that trains people to notice one good moment a day.

You will receive a photo and the joy category the user picked for it.

Your job: decide if the photo plausibly matches the category. Be generous — moments are subjective and the user is always the final authority. Only flag a mismatch when the photo clearly shows something unrelated (e.g. they picked "morning sunlight" but the photo shows a rainy car wiper).

If it matches (or is close enough), respond with exactly: MATCH

If it clearly doesn't match, respond in this exact format:
MISMATCH | [one short line: what you actually see, then a humble suggestion of a better-fitting category from this list: Morning sunlight / A small hello / One thing done slowly / A little movement / One corner clear / A sound you stopped for / Someone else's good moment / No name for it]

Tone rules for the mismatch line:
- Under 20 words
- State what you see plainly, no judgment
- Suggest with "feels more like... to me" — humble, never authoritative
- Never say "wrong", "incorrect", or "actually"
- Warm, quiet, like a friend leaning over`;

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

/**
 * Exact `MATCH`, or `MISMATCH | …`. Anything else fails open as MATCH
 * so a messy model reply never blocks the night.
 */
export function parseJoyMatch(raw: string): JoyMatchResult {
  const text = stripReasoning(raw).trim();
  if (text === "MATCH") return { kind: "match" };
  const mismatch = text.match(/^MISMATCH\s*\|\s*([\s\S]+)$/);
  const line = mismatch?.[1]?.trim() ?? "";
  if (!line) return { kind: "match" };
  return { kind: "mismatch", line, suggestedJoyId: suggestJoyId(line) };
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
      { type: "text", text: `Joy picked: ${input.joyTitle}\nPhoto:` },
      { type: "image_url", image_url: { url: input.imageDataUrl } },
    ];
    const result = await complete(
      joyMatchModels(),
      [
        { role: "system", content: JOY_MATCH_SYSTEM },
        { role: "user", content: userContent },
      ],
      { temperature: 0, maxTokens: 80 },
    );
    return parseJoyMatch(result.text);
  } catch {
    return { kind: "match" };
  }
}
