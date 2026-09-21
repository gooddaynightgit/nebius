import { cleanSpokenLine, isSelfNegating, isSilverLiningLine } from "./care";
import { hasTokenFactoryKey } from "./config";
import { getJoyById } from "./landing";
import { completeWithFallback, nanoModels, type ChatMessage } from "./nebius";
import { NANO_INGEST_SYSTEM, mockGoodMoment, spokenWords } from "./prompts";
import { imageDataUrlForModels } from "./model-image";
import { getBytes } from "./storage";
import type { CaptureKind, CaptureRecord } from "./types";

function parseGood(text: string): { good: string | null; reframed: boolean } {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return { good: null, reframed: false };
  try {
    const parsed = JSON.parse(match[0]) as { good?: string; reframed?: boolean };
    return {
      good: parsed.good?.trim() || null,
      reframed: Boolean(parsed.reframed),
    };
  } catch {
    return { good: null, reframed: false };
  }
}

function chosenSpoken(input: {
  text?: string;
  transcript?: string;
  caption?: string;
}): string {
  return spokenWords(input).replace(/\s+/g, " ").trim();
}

function fallbackIngest(input: {
  kind: CaptureKind;
  text?: string;
  transcript?: string;
  caption?: string;
}): { goodMoment: string; reframed: boolean } {
  const spoken = chosenSpoken(input);
  const goodMoment = mockGoodMoment(input);
  return { goodMoment, reframed: Boolean(spoken && isSelfNegating(spoken)) };
}

function guardIngestedGood(
  input: { text?: string; transcript?: string; caption?: string },
  nanoGood: string | null,
  fallback: { goodMoment: string; reframed: boolean },
): { goodMoment: string; reframed: boolean } {
  const spoken = chosenSpoken(input);
  if (spoken && isSelfNegating(spoken)) {
    if (nanoGood && !isSelfNegating(nanoGood) && nanoGood.length >= 8) {
      return { goodMoment: cleanSpokenLine(nanoGood), reframed: true };
    }
    return { goodMoment: fallback.goodMoment, reframed: true };
  }
  if (spoken) return { goodMoment: spoken, reframed: false };
  if (nanoGood && !isSelfNegating(nanoGood)) {
    return {
      goodMoment: cleanSpokenLine(nanoGood),
      reframed: isSilverLiningLine(nanoGood),
    };
  }
  return fallback;
}

export async function ingestGood(input: {
  kind: CaptureKind;
  text?: string;
  transcript?: string;
  caption?: string;
  imageDataUrl?: string;
}): Promise<{
  goodMoment: string;
  model: string;
  status: CaptureRecord["ingestStatus"];
  reframed: boolean;
}> {
  const fallback = fallbackIngest(input);
  if (!hasTokenFactoryKey()) {
    return { ...fallback, model: "mock", status: "mock" };
  }

  const source = [
    `kind: ${input.kind}`,
    input.transcript && `voice transcript: ${input.transcript}`,
    input.caption && `caption: ${input.caption}`,
    input.text && `note: ${input.text}`,
    !input.transcript && !input.caption && !input.text
      ? "The person saved a moment with no extra words."
      : "",
  ]
    .filter(Boolean)
    .join("\n");

  const userContent: ChatMessage["content"] = input.imageDataUrl
    ? [
        { type: "text", text: source },
        { type: "image_url", image_url: { url: input.imageDataUrl } },
      ]
    : source;

  try {
    const result = await completeWithFallback(
      nanoModels(Boolean(input.imageDataUrl)),
      [
        { role: "system", content: NANO_INGEST_SYSTEM },
        { role: "user", content: userContent },
      ],
      { temperature: 0.3, maxTokens: 220 },
    );
    const parsed = parseGood(result.text);
    const guarded = guardIngestedGood(input, parsed.good ?? result.text.slice(0, 220), fallback);
    return {
      ...guarded,
      reframed: guarded.reframed || parsed.reframed,
      model: result.model,
      status: "ok",
    };
  } catch {
    return { ...fallback, model: "mock-fallback", status: "skipped" };
  }
}

export async function captureImageDataUrl(
  capture: Pick<CaptureRecord, "mediaKey" | "mediaContentType">,
): Promise<string | undefined> {
  if (!capture.mediaKey) return undefined;
  const file = await getBytes(capture.mediaKey);
  if (!file?.body?.length) return undefined;
  const type = capture.mediaContentType || file.contentType || "image/jpeg";
  if (!type.startsWith("image/")) return undefined;
  return imageDataUrlForModels(type, file.body);
}

export async function ingestAppPhoto(input: {
  caption?: string;
  imageDataUrl?: string;
  joyType: string;
}): Promise<{
  goodMoment: string;
  model: string;
  status: CaptureRecord["ingestStatus"];
  reframed: boolean;
}> {
  const joy = getJoyById(input.joyType);
  const caption = (input.caption || "").replace(/\s+/g, " ").trim();
  const fallbackSpoken = caption || joy?.title || "this quiet moment";
  const fallback = fallbackIngest({
    kind: "photo",
    caption: fallbackSpoken,
  });
  const visionHint = input.imageDataUrl
    ? "Look at the private daily photo. Name one true visible detail (light, object, screen, place, gesture). Ground it in the joy pick. Sad or ordinary photos are allowed; horrific content is not your job here."
    : "No photo pixels available. Rephrase from the joy pick and caption only — still write a fresh good-moment sentence, never the canned playback template.";

  if (!hasTokenFactoryKey()) {
    const goodMoment = caption
      ? isSelfNegating(caption)
        ? fallback.goodMoment
        : caption
      : `You kept a still for ${joy?.title ?? "today"} — ${joy?.tagline ?? "a quiet moment that was yours."}`;
    return {
      goodMoment,
      reframed: Boolean(caption && isSelfNegating(caption)),
      model: "mock",
      status: "mock",
    };
  }

  const source = [
    `kind: photo`,
    `quiet joy pick: ${joy?.title ?? input.joyType}`,
    joy?.tagline ? `joy spirit: ${joy.tagline}` : "",
    caption ? `optional caption: ${caption}` : "no caption",
    visionHint,
    "Return JSON {\"good\":\"one warm sentence naming what THIS photo actually holds\",\"reframed\":false}.",
    "If the caption is sad or self-negating, set reframed true and return a silver lining — never celebrate despair.",
    "Do not quote or copy any story-playback template.",
  ]
    .filter(Boolean)
    .join("\n");

  const userContent: ChatMessage["content"] = input.imageDataUrl
    ? [
        { type: "text", text: source },
        { type: "image_url", image_url: { url: input.imageDataUrl } },
      ]
    : source;

  try {
    const result = await completeWithFallback(
      nanoModels(Boolean(input.imageDataUrl)),
      [
        { role: "system", content: NANO_INGEST_SYSTEM },
        { role: "user", content: userContent },
      ],
      { temperature: 0.35, maxTokens: 220 },
    );
    const parsed = parseGood(result.text);
    const nanoGood = parsed.good ?? result.text.slice(0, 220);
    if (caption && isSelfNegating(caption)) {
      if (nanoGood && !isSelfNegating(nanoGood) && nanoGood.length >= 8) {
        return {
          goodMoment: cleanSpokenLine(nanoGood),
          reframed: true,
          model: result.model,
          status: "ok",
        };
      }
      return { ...fallback, model: result.model, status: "ok" };
    }
    if (nanoGood && !isSelfNegating(nanoGood) && nanoGood.length >= 8) {
      return {
        goodMoment: cleanSpokenLine(nanoGood),
        reframed: parsed.reframed || isSilverLiningLine(nanoGood),
        model: result.model,
        status: "ok",
      };
    }
    return { ...fallback, model: result.model, status: "ok" };
  } catch {
    return { ...fallback, model: "mock-fallback", status: "skipped" };
  }
}
