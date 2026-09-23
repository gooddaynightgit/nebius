import { hasTokenFactoryKey } from "./config";
import { completeWithFallback, nanoModels, type ChatMessage } from "./nebius";
import {
  isHorrificFilename,
  isHorrificText,
  SAFETY_REFUSAL,
} from "./safety-text";

export { isHorrificFilename, isHorrificText, SAFETY_REFUSAL };

export async function inspectImageSafety(input: {
  caption?: string;
  filename?: string;
  imageDataUrl?: string;
}): Promise<{ safe: boolean; reason?: string; model?: string }> {
  if (isHorrificText(input.caption) || isHorrificFilename(input.filename)) {
    return { safe: false, reason: "denylist" };
  }
  if (!input.imageDataUrl || !hasTokenFactoryKey()) {
    return { safe: true, model: "local" };
  }
  try {
    const userContent: ChatMessage["content"] = [
      {
        type: "text",
        text: "Does this private daily photo contain violence, gore, abuse, pornography, hate, or self-harm? Reply ONLY JSON {\"safe\":true} or {\"safe\":false}. Ugly, blurry, messy, ordinary, sad, or hard life photos are safe.",
      },
      { type: "image_url", image_url: { url: input.imageDataUrl } },
    ];
    const result = await completeWithFallback(
      nanoModels(true),
      [
        {
          role: "system",
          content:
            "You are a narrow safety filter for a private bedtime-journal photo. Block only horrific content: violence, gore, abuse, porn, hate, self-harm. Allow ugly, blurry, messy, ordinary, sad, and hard photos. JSON only.",
        },
        { role: "user", content: userContent },
      ],
      { temperature: 0, maxTokens: 40 },
    );
    const match = result.text.match(/\{[\s\S]*\}/);
    if (!match) return { safe: true, model: result.model };
    const parsed = JSON.parse(match[0]) as { safe?: boolean };
    if (parsed.safe === false) return { safe: false, reason: "model", model: result.model };
    return { safe: true, model: result.model };
  } catch {
    return { safe: true, model: "local-fallback" };
  }
}
