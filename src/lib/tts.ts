import { MODELS, hasTokenFactoryKey } from "./config";

export type TtsResult = {
  status: "sonic" | "stub" | "skipped";
  model?: string;
  audio?: Buffer;
  contentType?: string;
  note: string;
};

const SONIC_TODO =
  "TODO: NVIDIA Sonic is not in the Token Factory public catalog (checked 2026-09-20 against /api/public/models_info and model-catalog.md). No /v1/audio/speech route is documented. When a Sonic or Magpie TTS model id is published, set NEBIUS_SONIC_MODEL and this stub will call OpenAI-compatible speech synthesis. The story text is still returned so the demo plays via the browser's calm voice.";

export async function synthesizeStory(text: string): Promise<TtsResult> {
  const model = MODELS.sonic.trim();
  if (!model || !hasTokenFactoryKey()) {
    return { status: "stub", note: SONIC_TODO };
  }

  const root = (process.env.NEBIUS_TOKEN_FACTORY_BASE_URL ??
    "https://api.tokenfactory.nebius.com/v1/").replace(/\/+$/, "");

  try {
    const res = await fetch(`${root}/audio/speech`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.NEBIUS_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        voice: MODELS.sonicVoice,
        input: text.slice(0, 4000),
        response_format: "mp3",
      }),
    });
    if (!res.ok) {
      const err = await res.text();
      return {
        status: "stub",
        model,
        note: `${SONIC_TODO} Token Factory speech call failed (${res.status}): ${err.slice(0, 180)}`,
      };
    }
    const audio = Buffer.from(await res.arrayBuffer());
    return {
      status: "sonic",
      model,
      audio,
      contentType: res.headers.get("content-type") ?? "audio/mpeg",
      note: `Spoken with ${model}`,
    };
  } catch (error) {
    return {
      status: "stub",
      model,
      note: `${SONIC_TODO} ${error instanceof Error ? error.message : "speech request failed"}`,
    };
  }
}
