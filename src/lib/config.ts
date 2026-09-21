export const TOKEN_FACTORY_BASE =
  process.env.NEBIUS_TOKEN_FACTORY_BASE_URL ??
  "https://api.tokenfactory.nebius.com/v1/";

export const MODELS = {
  nano:
    process.env.NEBIUS_NANO_MODEL ?? "nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B",
  nanoOmni: process.env.NEBIUS_NANO_OMNI_MODEL ?? "nvidia/nemotron-3-nano-omni",
  // Catalog snapshot 2026-09-21: no Qwen VL id is listed. MiniCPM-V is the
  // dedicated image2text VL in eu-north1. Override to a Qwen VL id if Token
  // Factory lists one (docs still mention Qwen/Qwen2-VL-72B-Instruct).
  vision: process.env.NEBIUS_VISION_MODEL ?? "openbmb/MiniCPM-V-4_5",
  // YOURS closer — short Nightly Reflection. Catalog snapshot 2026-09-21 lists
  // moonshotai/Kimi-K2.6 (general Kimi, us-central1). moonshotai/Kimi-K2-Instruct
  // and moonshotai/Kimi-K2.5 are not in that snapshot; Kimi-K2.7-Code is coding.
  // Override NEBIUS_STORY_MODEL if your key has another Kimi id. Falls back to Super.
  story: process.env.NEBIUS_STORY_MODEL ?? "moonshotai/Kimi-K2.6",
  // Text-only photo excavation when vision fails — keep off the Kimi closer.
  excavateText:
    process.env.NEBIUS_EXCAVATE_TEXT_MODEL ?? "Qwen/Qwen3-235B-A22B-Instruct-2507",
  super:
    process.env.NEBIUS_SUPER_MODEL ?? "nvidia/nemotron-3-super-120b-a12b",
  ultra:
    process.env.NEBIUS_ULTRA_MODEL ?? "nvidia/Nemotron-3-Ultra-550b-a55b",
  ultraFallback:
    process.env.NEBIUS_ULTRA_FALLBACK_MODEL ??
    "nvidia/Llama-3_1-Nemotron-Ultra-253B-v1",
  sonic: process.env.NEBIUS_SONIC_MODEL ?? "",
  sonicVoice:
    process.env.NEBIUS_SONIC_VOICE ?? "Magpie-Multilingual.EN-US.Aria.Calm",
};

export function hasTokenFactoryKey(): boolean {
  return Boolean(process.env.NEBIUS_API_KEY?.trim());
}

export function useUltra(): boolean {
  return process.env.NEBIUS_USE_ULTRA === "1";
}

export function hasNebiusObjectStorage(): boolean {
  return Boolean(
    process.env.NEBIUS_S3_BUCKET &&
      process.env.NEBIUS_S3_ACCESS_KEY_ID &&
      process.env.NEBIUS_S3_SECRET_ACCESS_KEY &&
      process.env.NEBIUS_S3_ENDPOINT,
  );
}

export function hasVercelBlob(): boolean {
  return Boolean(
    process.env.BLOB_READ_WRITE_TOKEN?.trim() ||
      (process.env.VERCEL && process.env.BLOB_STORE_ID),
  );
}

export function blobAccess(): "private" | "public" {
  return process.env.BLOB_ACCESS === "public" ? "public" : "private";
}

export function dataDir(): string {
  if (process.env.DATA_DIR) return process.env.DATA_DIR;
  if (process.env.VERCEL) return "/tmp/gooddaynight";
  return ".data";
}

export function weaveCronSecret(): string | undefined {
  return process.env.WEAVE_CRON_SECRET?.trim() || undefined;
}
