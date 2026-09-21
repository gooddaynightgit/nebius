import { decode as decodeJpeg, encode as encodeJpegRaw } from "jpeg-js";
import { fitWithin } from "./prepare-photo";

/** Max long edge sent to Token Factory (excavation + multimodal closer). */
export const MODEL_IMAGE_MAX_EDGE = 1440;
/** Target decoded JPEG size for model calls (~1MB). Original blob is unchanged. */
export const MODEL_IMAGE_TARGET_BYTES = 1024 * 1024;
const QUALITIES = [85, 72, 58];
const EDGES = [MODEL_IMAGE_MAX_EDGE, 1280];
const MAX_DECODE_PIXELS = 12_000_000;

const DATA_URL_RE = /^data:([^;,]+);base64,([\s\S]+)$/i;

export function parseImageDataUrl(dataUrl: string): { mime: string; bytes: Buffer } | null {
  const match = DATA_URL_RE.exec(dataUrl.trim());
  if (!match) return null;
  try {
    const bytes = Buffer.from(match[2], "base64");
    if (!bytes.length) return null;
    return { mime: match[1].toLowerCase(), bytes };
  } catch {
    return null;
  }
}

export function jpegDataUrl(bytes: Uint8Array | Buffer): string {
  return `data:image/jpeg;base64,${Buffer.from(bytes).toString("base64")}`;
}

export function jpegDimensions(bytes: Uint8Array): { width: number; height: number } | null {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return null;
  let offset = 2;
  while (offset + 9 < bytes.length) {
    if (bytes[offset] !== 0xff) return null;
    const marker = bytes[offset + 1] ?? 0;
    if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      offset += 2;
      continue;
    }
    if (marker === 0xda || marker === 0xd9) break;
    const size = ((bytes[offset + 2] ?? 0) << 8) | (bytes[offset + 3] ?? 0);
    if (size < 2) return null;
    const sof =
      (marker >= 0xc0 && marker <= 0xc3) ||
      (marker >= 0xc5 && marker <= 0xc7) ||
      (marker >= 0xc9 && marker <= 0xcb) ||
      (marker >= 0xcd && marker <= 0xcf);
    if (sof) {
      const height = ((bytes[offset + 5] ?? 0) << 8) | (bytes[offset + 6] ?? 0);
      const width = ((bytes[offset + 7] ?? 0) << 8) | (bytes[offset + 8] ?? 0);
      if (width && height) return { width, height };
      return null;
    }
    offset += 2 + size;
  }
  return null;
}

function isJpegMime(mime: string): boolean {
  return mime === "image/jpeg" || mime === "image/jpg";
}

function sampleRgba(
  src: Uint8Array,
  srcW: number,
  srcH: number,
  destW: number,
  destH: number,
): Uint8Array {
  const dest = new Uint8Array(destW * destH * 4);
  for (let y = 0; y < destH; y += 1) {
    const srcY = Math.min(srcH - 1, Math.floor(((y + 0.5) * srcH) / destH));
    for (let x = 0; x < destW; x += 1) {
      const srcX = Math.min(srcW - 1, Math.floor(((x + 0.5) * srcW) / destW));
      const si = (srcY * srcW + srcX) * 4;
      const di = (y * destW + x) * 4;
      dest[di] = src[si] ?? 0;
      dest[di + 1] = src[si + 1] ?? 0;
      dest[di + 2] = src[si + 2] ?? 0;
      dest[di + 3] = 255;
    }
  }
  return dest;
}

function encodeJpeg(
  data: Uint8Array,
  width: number,
  height: number,
  quality: number,
): Buffer {
  const encoded = encodeJpegRaw({ data, width, height }, quality);
  return Buffer.from(encoded.data);
}

/**
 * Downscale / JPEG-compress a data URL for Token Factory multimodal calls.
 * Returns the original string if it is already small enough, not a JPEG, or
 * decode fails. Keep/download still uses the vault blob, not this result.
 */
export function shrinkDataUrlForModels(dataUrl: string): string {
  const parsed = parseImageDataUrl(dataUrl);
  if (!parsed) return dataUrl;
  const dims = isJpegMime(parsed.mime) ? jpegDimensions(parsed.bytes) : null;
  const alreadyFits =
    parsed.bytes.length <= MODEL_IMAGE_TARGET_BYTES &&
    (!dims || Math.max(dims.width, dims.height) <= MODEL_IMAGE_MAX_EDGE);
  if (alreadyFits) return dataUrl;
  if (!isJpegMime(parsed.mime) && parsed.bytes[0] !== 0xff && parsed.bytes[1] !== 0xd8) {
    return dataUrl;
  }

  try {
    const decoded = decodeJpeg(parsed.bytes, {
      useTArray: true,
      formatAsRGBA: true,
      maxMemoryUsageInMB: 96,
    });
    const srcW = decoded.width;
    const srcH = decoded.height;
    if (!srcW || !srcH) return dataUrl;
    if (srcW * srcH > MAX_DECODE_PIXELS) {
      console.warn(
        `[yours] model image too many pixels to shrink ${srcW}x${srcH}; sending original`,
      );
      return dataUrl;
    }

    const src = decoded.data as Uint8Array;
    let best: Buffer | null = null;
    for (const edge of EDGES) {
      const fitted = fitWithin(srcW, srcH, edge);
      const pixels =
        fitted.width === srcW && fitted.height === srcH
          ? src
          : sampleRgba(src, srcW, srcH, fitted.width, fitted.height);
      for (const quality of QUALITIES) {
        const encoded = encodeJpeg(pixels, fitted.width, fitted.height, quality);
        if (!best || encoded.length < best.length) best = encoded;
        if (encoded.length <= MODEL_IMAGE_TARGET_BYTES) {
          logShrink(parsed.bytes.length, encoded.length, fitted.width, fitted.height);
          return jpegDataUrl(encoded);
        }
      }
    }
    if (best && best.length < parsed.bytes.length) {
      logShrink(parsed.bytes.length, best.length, 0, 0);
      return jpegDataUrl(best);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`[yours] model image shrink failed: ${message.slice(0, 160)}`);
  }
  return dataUrl;
}

export function imageDataUrlForModels(mime: string, bytes: Uint8Array | Buffer): string {
  const type = (mime || "image/jpeg").split(";")[0]?.trim() || "image/jpeg";
  const buf = Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes);
  return shrinkDataUrlForModels(`data:${type};base64,${buf.toString("base64")}`);
}

function logShrink(fromBytes: number, toBytes: number, width: number, height: number) {
  const size = width && height ? `${width}x${height} ` : "";
  console.info(`[yours] model image shrunk ${fromBytes} → ${toBytes} bytes ${size}`.trim());
}
