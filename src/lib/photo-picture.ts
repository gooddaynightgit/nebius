/** Shown beside the capture heading when the file is not a usable still. */
export const PHOTO_NOT_A_PICTURE =
  "That one didn't come through as a photo. Please capture or choose a picture of your good moment.";

/** Shown when the file is a photo but has no clear subject or scene. */
export const PHOTO_NOT_CLEAR =
  "That one didn't come through clearly. Please capture or choose a clear picture of your good moment.";

const VIDEO_EXT = /\.(mp4|m4v|mov|webm|avi|mkv|mpeg|mpg|3gp|3gpp|ogv|wmv|qt|ts|mts)$/i;
const STILL_EXT = /\.(jpe?g|png|webp|gif|hei[cf]s?|bmp|tiff?)$/i;

/**
 * Measured on a 64×64 greyscale copy.
 * Flat fields (std ≤ 8) and near-white or near-black flats stay rejected.
 * Near-uniform frames (plain wall, sky, a finger on the lens) have a very
 * low Laplacian even when slight texture or a soft gradient lifts the std.
 * Almost-black frames are rejected only when that detail is also missing,
 * so a dim but visible scene can pass.
 */
export const PICTURE_EDGE = {
  sample: 64,
  flatStd: 8,
  extremeStd: 12,
  blackMean: 16,
  whiteMean: 242,
  /** Mean absolute Laplacian on interior pixels. */
  uniformLap: 4.5,
  /** Soft gradients can lift std without adding a subject. */
  uniformStdCap: 36,
  almostBlackMean: 34,
  almostBlackLap: 6,
} as const;

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

/** First line of a vision description: whether a subject or scene is identifiable. */
export function readPhotoClear(text: string): boolean | null {
  const match = text.match(/^\s*CLEAR:\s*(yes|no)\b/i);
  if (!match?.[1]) return null;
  return match[1].toLowerCase() === "yes";
}

/** Drop the CLEAR line so the kept description is only the picture read. */
export function stripPhotoClear(text: string): string {
  return text.replace(/^\s*CLEAR:\s*(yes|no)\b[^\n]*\n?/i, "").trim();
}

export function luminanceOf(r: number, g: number, b: number): number {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export type PictureStats = {
  mean: number;
  std: number;
  /** Mean absolute Laplacian. 0 when the grid is too small to measure. */
  lap: number;
  blank: boolean;
  unclear: boolean;
};

export function blankFromSamples(
  samples: ArrayLike<number>,
  channels: 3 | 4,
): { mean: number; std: number; blank: boolean } {
  const stats = pictureStats(samples, channels);
  return { mean: stats.mean, std: stats.std, blank: stats.blank };
}

export function isBlankLuminance(mean: number, std: number): boolean {
  const edge = PICTURE_EDGE;
  if (std <= edge.flatStd) return true;
  if (mean <= edge.blackMean && std <= edge.extremeStd) return true;
  if (mean >= edge.whiteMean && std <= edge.extremeStd) return true;
  return false;
}

/** True for a flat field, a near-uniform surface, or an almost-black frame with no detail. */
export function isUnclearPicture(mean: number, std: number, lap: number): boolean {
  if (isBlankLuminance(mean, std)) return true;
  const edge = PICTURE_EDGE;
  if (lap <= edge.uniformLap && std <= edge.uniformStdCap) return true;
  if (mean <= edge.almostBlackMean && lap <= edge.almostBlackLap) return true;
  return false;
}

export function pictureStats(
  samples: ArrayLike<number>,
  channels: 3 | 4,
  width?: number,
  height?: number,
): PictureStats {
  const count = Math.floor(samples.length / channels);
  if (count <= 0) return { mean: 0, std: 0, lap: 0, blank: true, unclear: true };
  const luma = new Float64Array(count);
  let sum = 0;
  let sumSq = 0;
  for (let i = 0; i < count; i += 1) {
    const offset = i * channels;
    const y = luminanceOf(samples[offset] ?? 0, samples[offset + 1] ?? 0, samples[offset + 2] ?? 0);
    luma[i] = y;
    sum += y;
    sumSq += y * y;
  }
  const mean = sum / count;
  const variance = Math.max(0, sumSq / count - mean * mean);
  const std = Math.sqrt(variance);
  const gridWidth = width && width > 0 ? width : 0;
  const gridHeight = height && height > 0 ? height : 0;
  let lap = 0;
  if (gridWidth >= 3 && gridHeight >= 3 && gridWidth * gridHeight <= count) {
    let lapSum = 0;
    let lapCount = 0;
    for (let y = 1; y < gridHeight - 1; y += 1) {
      for (let x = 1; x < gridWidth - 1; x += 1) {
        const i = y * gridWidth + x;
        const value = Math.abs(
          4 * luma[i]! - luma[i - 1]! - luma[i + 1]! - luma[i - gridWidth]! - luma[i + gridWidth]!,
        );
        lapSum += value;
        lapCount += 1;
      }
    }
    lap = lapCount ? lapSum / lapCount : 0;
  }
  const blank = isBlankLuminance(mean, std);
  return { mean, std, lap, blank, unclear: isUnclearPicture(mean, std, lap) };
}

/** Browser check on the same 64×64 rule, before a photo is kept or sent. */
export async function blobLooksBlank(blob: Blob): Promise<boolean> {
  if (typeof createImageBitmap !== "function" || typeof document === "undefined") {
    throw new Error(PHOTO_NOT_A_PICTURE);
  }
  const bitmap = await createImageBitmap(blob);
  try {
    const canvas = document.createElement("canvas");
    canvas.width = PICTURE_EDGE.sample;
    canvas.height = PICTURE_EDGE.sample;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) throw new Error(PHOTO_NOT_A_PICTURE);
    ctx.drawImage(bitmap, 0, 0, PICTURE_EDGE.sample, PICTURE_EDGE.sample);
    return pictureStats(
      ctx.getImageData(0, 0, PICTURE_EDGE.sample, PICTURE_EDGE.sample).data,
      4,
      PICTURE_EDGE.sample,
      PICTURE_EDGE.sample,
    ).unclear;
  } finally {
    bitmap.close();
  }
}
