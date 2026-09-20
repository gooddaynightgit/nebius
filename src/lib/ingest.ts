import { cleanSpokenLine, isSelfNegating, isSilverLiningLine, prepareSpoken } from "./care";
import { hasTokenFactoryKey } from "./config";
import { completeWithFallback, nanoModels, type ChatMessage } from "./nebius";
import { NANO_INGEST_SYSTEM, mockGoodMoment } from "./prompts";
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

function fallbackIngest(input: {
  kind: CaptureKind;
  text?: string;
  transcript?: string;
  caption?: string;
}): { goodMoment: string; reframed: boolean } {
  const spoken = prepareSpoken(input);
  const goodMoment = mockGoodMoment(input);
  return { goodMoment, reframed: Boolean(spoken && isSelfNegating(spoken)) };
}

function guardIngestedGood(
  input: { text?: string; transcript?: string; caption?: string },
  nanoGood: string | null,
  fallback: { goodMoment: string; reframed: boolean },
): { goodMoment: string; reframed: boolean } {
  const spoken = prepareSpoken(input);
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
