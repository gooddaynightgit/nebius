/** Shown beside Capture it when the file is not a usable still. */
export const PHOTO_NOT_A_PICTURE =
  "That one didn't come through as a photo. Please capture or choose a picture of your good moment.";

const VIDEO_EXT = /\.(mp4|m4v|mov|webm|avi|mkv|mpeg|mpg|3gp|3gpp|ogv|wmv|qt|ts|mts)$/i;
const STILL_EXT = /\.(jpe?g|png|webp|gif|hei[cf]s?|bmp|tiff?)$/i;

/** A single flat field, or a field that is essentially black or white. */
const FLAT_STD = 8;
const EXTREME_STD = 12;
const BLACK_MEAN = 16;
const WHITE_MEAN = 242;

export function isVideoFile(file: { type?: string; name?: string }): boolean {
  const type = (file.type || "").toLowerCase().split(";")[0]?.trim() ?? "";
  const name = file.name || "";
  return type.startsWith("video/") || VIDEO_EXT.test(name);
}

function vagueType(type: string): boolean {
  return (
    !type ||
    type === "application/octet-stream" ||
    type === "binary/octet-stream" ||
    type === "application/download"
  );
}

/** Still images only. A video MIME or a video extension is never a picture. */
export function isStillImageFile(file: { type?: string; name?: string }): boolean {
  if (isVideoFile(file)) return false;
  const type = (file.type || "").toLowerCase().split(";")[0]?.trim() ?? "";
  if (type.startsWith("image/")) return true;
  if (vagueType(type) && STILL_EXT.test(file.name || "")) return true;
  return false;
}

export function luminanceOf(r: number, g: number, b: number): number {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function blankFromSamples(
  samples: ArrayLike<number>,
  channels: 3 | 4,
): { mean: number; std: number; blank: boolean } {
  const count = Math.floor(samples.length / channels);
  if (count <= 0) return { mean: 0, std: 0, blank: true };
  let sum = 0;
  let sumSq = 0;
  for (let i = 0; i < count; i += 1) {
    const offset = i * channels;
    const y = luminanceOf(samples[offset] ?? 0, samples[offset + 1] ?? 0, samples[offset + 2] ?? 0);
    sum += y;
    sumSq += y * y;
  }
  const mean = sum / count;
  const variance = Math.max(0, sumSq / count - mean * mean);
  const std = Math.sqrt(variance);
  return { mean, std, blank: isBlankLuminance(mean, std) };
}

export function isBlankLuminance(mean: number, std: number): boolean {
  if (std <= FLAT_STD) return true;
  if (mean <= BLACK_MEAN && std <= EXTREME_STD) return true;
  if (mean >= WHITE_MEAN && std <= EXTREME_STD) return true;
  return false;
}

/** Browser check on the same 64×64 rule, before a photo is kept or sent. */
export async function blobLooksBlank(blob: Blob): Promise<boolean> {
  if (typeof createImageBitmap !== "function" || typeof document === "undefined") {
    throw new Error(PHOTO_NOT_A_PICTURE);
  }
  const bitmap = await createImageBitmap(blob);
  try {
    const canvas = document.createElement("canvas");
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) throw new Error(PHOTO_NOT_A_PICTURE);
    ctx.drawImage(bitmap, 0, 0, 64, 64);
    return blankFromSamples(ctx.getImageData(0, 0, 64, 64).data, 4).blank;
  } finally {
    bitmap.close();
  }
}
