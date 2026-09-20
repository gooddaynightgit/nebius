import { hasTokenFactoryKey } from "./config";
import { completeWithFallback, nanoModels, type ChatMessage } from "./nebius";
import { NANO_INGEST_SYSTEM, mockGoodMoment } from "./prompts";
import type { CaptureKind, CaptureRecord } from "./types";

function parseGood(text: string): string | null {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    const parsed = JSON.parse(match[0]) as { good?: string };
    return parsed.good?.trim() || null;
  } catch {
    return null;
  }
}

export async function ingestGood(input: {
  kind: CaptureKind;
  text?: string;
  transcript?: string;
  caption?: string;
  imageDataUrl?: string;
}): Promise<{ goodMoment: string; model: string; status: CaptureRecord["ingestStatus"] }> {
  const fallback = mockGoodMoment(input);
  if (!hasTokenFactoryKey()) {
    return { goodMoment: fallback, model: "mock", status: "mock" };
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
    return {
      goodMoment: parseGood(result.text) ?? result.text.slice(0, 220) ?? fallback,
      model: result.model,
      status: "ok",
    };
  } catch {
    return { goodMoment: fallback, model: "mock-fallback", status: "skipped" };
  }
}
