import { MODELS, MODEL_DEFAULTS, hasTokenFactoryKey, tokenFactoryBase } from "./config";

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string | Array<Record<string, unknown>>;
};

export function stripReasoning(text: string): string {
  return text
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .replace(/```thinking[\s\S]*?```/gi, "")
    .trim();
}

function apiRoot(): string {
  return tokenFactoryBase().replace(/\/+$/, "");
}

export async function chatComplete(options: {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
}): Promise<{ text: string; model: string }> {
  if (!hasTokenFactoryKey()) {
    throw new Error("NEBIUS_API_KEY is not set");
  }
  const res = await fetch(`${apiRoot()}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.NEBIUS_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: options.model,
      messages: options.messages,
      temperature: options.temperature ?? 0.6,
      max_tokens: options.maxTokens ?? 900,
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Token Factory ${options.model} failed (${res.status}): ${err.slice(0, 400)}`);
  }
  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const text = stripReasoning(data.choices?.[0]?.message?.content ?? "");
  return { text, model: options.model };
}

export async function completeWithFallback(
  models: string[],
  messages: ChatMessage[],
  options?: { temperature?: number; maxTokens?: number },
): Promise<{ text: string; model: string }> {
  let lastError: unknown;
  for (const model of models.filter(Boolean)) {
    try {
      return await chatComplete({ model, messages, ...options });
    } catch (error) {
      lastError = error;
      const message = error instanceof Error ? error.message : String(error);
      console.warn(`[token-factory] ${model} failed: ${message.slice(0, 240)}`);
    }
  }
  throw lastError instanceof Error ? lastError : new Error("All models failed");
}

export function uniqueModels(...ids: Array<string | undefined | null>): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of ids) {
    const id = raw?.trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}

export function nanoModels(multimodal: boolean): string[] {
  if (multimodal && MODELS.nanoOmni) {
    return uniqueModels(MODELS.nanoOmni, MODEL_DEFAULTS.nanoOmni, MODELS.nano, MODEL_DEFAULTS.nano);
  }
  return uniqueModels(MODELS.nano, MODEL_DEFAULTS.nano);
}

export function visionModels(): string[] {
  return uniqueModels(MODELS.vision, MODEL_DEFAULTS.vision, MODELS.nanoOmni, MODEL_DEFAULTS.nanoOmni);
}

/** Catalog image2text Kimi ids. Coding Kimi and instruct text models stay text-only. */
export function isImage2TextCloser(model: string): boolean {
  const id = model.trim();
  if (!id) return false;
  if (/code/i.test(id)) return false;
  return /moonshotai\/kimi-k2\.6\b/i.test(id) || /moonshotai\/kimi-k3\b/i.test(id);
}

/** Image2text Kimi (K2.6 / K3) — YOURS sends the photo when one is attached. */
export function appStoryVisionModels(): string[] {
  return uniqueModels(MODELS.story).filter(isImage2TextCloser);
}

/** Text2text Nightly Reflection: configured text id, then Qwen instruct, then Super. */
export function appStoryTextModels(): string[] {
  const storyIfText = isImage2TextCloser(MODELS.story) ? undefined : MODELS.story;
  const ids = uniqueModels(
    storyIfText,
    MODELS.storyText,
    MODEL_DEFAULTS.storyText,
    MODELS.super,
    MODEL_DEFAULTS.super,
  );
  return ids.length ? ids : [MODEL_DEFAULTS.storyText, MODEL_DEFAULTS.super];
}

export function appStoryModels(): string[] {
  return uniqueModels(...appStoryVisionModels(), ...appStoryTextModels());
}

export function textExcavateModels(): string[] {
  return uniqueModels(
    MODELS.excavateText,
    MODEL_DEFAULTS.excavateText,
    MODELS.nano,
    MODEL_DEFAULTS.nano,
    MODELS.super,
    MODEL_DEFAULTS.super,
  );
}

export function superModels(): string[] {
  return uniqueModels(MODELS.super, MODEL_DEFAULTS.super);
}

export function ultraModels(): string[] {
  return uniqueModels(
    MODELS.ultra,
    MODEL_DEFAULTS.ultra,
    MODELS.ultraFallback,
    MODEL_DEFAULTS.ultraFallback,
    MODELS.super,
    MODEL_DEFAULTS.super,
  );
}

export { MODELS };
