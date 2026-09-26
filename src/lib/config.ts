export const TOKEN_FACTORY_DEFAULT = "https://api.tokenfactory.nebius.com/v1/";

export const MODEL_DEFAULTS = {
  nano: "nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B",
  nanoOmni: "nvidia/nemotron-3-nano-omni",
  // Catalog snapshot 2026-09-21: no Qwen VL id is listed. MiniCPM-V is the
  // dedicated image2text VL in eu-north1. Override to a Qwen VL id if Token
  // Factory lists one (docs still mention Qwen/Qwen2-VL-72B-Instruct).
  vision: "openbmb/MiniCPM-V-4_5",
  // YOURS closer — short Nightly Reflection. Catalog snapshot 2026-09-21 lists
  // moonshotai/Kimi-K2.6 as image2text (us-central1). YOURS sends the photo plus
  // excavation, joy, and optional caption. moonshotai/Kimi-K3 is also image2text;
  // moonshotai/Kimi-K2.7-Code is text2text (coding). Override NEBIUS_STORY_MODEL
  // to a text-only id if needed — the closer then stays text-only. After Kimi,
  // text2text Qwen instruct, then Super. Mock only if every live path fails.
  story: "moonshotai/Kimi-K2.6",
  storyText: "Qwen/Qwen3-235B-A22B-Instruct-2507",
  excavateText: "Qwen/Qwen3-235B-A22B-Instruct-2507",
  super: "nvidia/nemotron-3-super-120b-a12b",
  ultra: "nvidia/Nemotron-3-Ultra-550b-a55b",
  ultraFallback: "nvidia/Llama-3_1-Nemotron-Ultra-253B-v1",
  sonic: "",
  sonicVoice: "Magpie-Multilingual.EN-US.Aria.Calm",
} as const;

/**
 * Read an env var, treating missing / blank / whitespace as unset.
 * Vercel empty-string env rows are not the same as deleting the row — `??`
 * would keep "" and wipe catalog defaults.
 */
export function envOr(name: string, fallback: string): string {
  const raw = process.env[name];
  if (raw == null) return fallback;
  const trimmed = raw.trim();
  return trimmed.length ? trimmed : fallback;
}

export function tokenFactoryBase(): string {
  return envOr("NEBIUS_TOKEN_FACTORY_BASE_URL", TOKEN_FACTORY_DEFAULT);
}

/** Live Token Factory root. Prefer `tokenFactoryBase()`; this stays a string for callers. */
export const TOKEN_FACTORY_BASE = TOKEN_FACTORY_DEFAULT;

export const MODELS = {
  get nano() {
    return envOr("NEBIUS_NANO_MODEL", MODEL_DEFAULTS.nano);
  },
  get nanoOmni() {
    return envOr("NEBIUS_NANO_OMNI_MODEL", MODEL_DEFAULTS.nanoOmni);
  },
  get vision() {
    return envOr("NEBIUS_VISION_MODEL", MODEL_DEFAULTS.vision);
  },
  get story() {
    return envOr("NEBIUS_STORY_MODEL", MODEL_DEFAULTS.story);
  },
  get storyText() {
    return envOr("NEBIUS_STORY_TEXT_MODEL", MODEL_DEFAULTS.storyText);
  },
  get excavateText() {
    return envOr("NEBIUS_EXCAVATE_TEXT_MODEL", MODEL_DEFAULTS.excavateText);
  },
  get super() {
    return envOr("NEBIUS_SUPER_MODEL", MODEL_DEFAULTS.super);
  },
  get ultra() {
    return envOr("NEBIUS_ULTRA_MODEL", MODEL_DEFAULTS.ultra);
  },
  get ultraFallback() {
    return envOr("NEBIUS_ULTRA_FALLBACK_MODEL", MODEL_DEFAULTS.ultraFallback);
  },
  get sonic() {
    return envOr("NEBIUS_SONIC_MODEL", MODEL_DEFAULTS.sonic);
  },
  get sonicVoice() {
    return envOr("NEBIUS_SONIC_VOICE", MODEL_DEFAULTS.sonicVoice);
  },
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

/** Shared secret for Vercel Cron. The daily moment sweep refuses the call when this is empty. */
export function cronSecret(): string | undefined {
  return process.env.CRON_SECRET?.trim() || undefined;
}
