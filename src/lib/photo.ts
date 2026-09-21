import { dayFromUnixMs, dayFromUnixMsWithOffset, exifDateToDay, isValidTzOffset } from "./day";

const IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/heic",
  "image/heif",
]);

export function isImageMime(type: string): boolean {
  const normalized = type.toLowerCase().split(";")[0]?.trim() ?? "";
  return IMAGE_TYPES.has(normalized) || normalized.startsWith("image/");
}

export function isVideoMime(type: string): boolean {
  return type.toLowerCase().startsWith("video/");
}

export function looksLikeMemeName(name: string): boolean {
  return /\b(meme|giphy|tenor|imgur)\b/i.test(name);
}

export function looksLikeBorrowedName(name: string): boolean {
  return /\b(unsplash|pexels|getty|shutterstock|istock|stockphoto)\b/i.test(name);
}

export function bufferToArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

function readAscii(view: DataView, offset: number, length: number): string {
  let out = "";
  const end = Math.min(offset + length, view.byteLength);
  for (let i = offset; i < end; i += 1) {
    const code = view.getUint8(i);
    if (code === 0) break;
    out += String.fromCharCode(code);
  }
  return out;
}

function tiffUint16(view: DataView, offset: number, little: boolean): number {
  return little ? view.getUint16(offset, true) : view.getUint16(offset, false);
}

function tiffUint32(view: DataView, offset: number, little: boolean): number {
  return little ? view.getUint32(offset, true) : view.getUint32(offset, false);
}

function readIfdDate(
  view: DataView,
  tiffStart: number,
  ifdOffset: number,
  little: boolean,
  wantedTag: number,
): string | null {
  if (tiffStart + ifdOffset + 2 > view.byteLength) return null;
  const count = tiffUint16(view, tiffStart + ifdOffset, little);
  for (let i = 0; i < count; i += 1) {
    const entry = tiffStart + ifdOffset + 2 + i * 12;
    if (entry + 12 > view.byteLength) return null;
    const tag = tiffUint16(view, entry, little);
    const type = tiffUint16(view, entry + 2, little);
    const size = tiffUint32(view, entry + 4, little);
    const valueOffset = tiffUint32(view, entry + 8, little);
    if (tag === wantedTag && type === 2 && size >= 10) {
      const start = size <= 4 ? entry + 8 : tiffStart + valueOffset;
      const raw = readAscii(view, start, size);
      const day = exifDateToDay(raw);
      if (day) return day;
    }
    if (tag === 0x8769 && wantedTag === 0x9003) {
      const nested = readIfdDate(view, tiffStart, valueOffset, little, 0x9003);
      if (nested) return nested;
    }
  }
  return null;
}

/** Returns YYYY-MM-DD from JPEG Exif DateTimeOriginal when present. */
export function readExifTakenDay(bytes: ArrayBuffer): string | null {
  const view = new DataView(bytes);
  if (view.byteLength < 4 || view.getUint16(0, false) !== 0xffd8) return null;
  let offset = 2;
  while (offset + 4 <= view.byteLength) {
    if (view.getUint8(offset) !== 0xff) break;
    const marker = view.getUint8(offset + 1);
    const size = view.getUint16(offset + 2, false);
    if (marker === 0xe1 && offset + 4 + 6 <= view.byteLength) {
      const head = readAscii(view, offset + 4, 6);
      if (head.startsWith("Exif")) {
        const tiffStart = offset + 10;
        if (tiffStart + 8 > view.byteLength) return null;
        const b0 = view.getUint8(tiffStart);
        const b1 = view.getUint8(tiffStart + 1);
        const little = b0 === 0x49 && b1 === 0x49;
        const motorola = b0 === 0x4d && b1 === 0x4d;
        if (!little && !motorola) return null;
        const ifd0 = tiffUint32(view, tiffStart + 4, little);
        return (
          readIfdDate(view, tiffStart, ifd0, little, 0x9003) ||
          readIfdDate(view, tiffStart, ifd0, little, 0x0132)
        );
      }
    }
    if (size < 2) break;
    offset += 2 + size;
  }
  return null;
}

export type PhotoDateCheck = {
  takenDay: string | null;
  verified: boolean;
  reason: "exif" | "file" | "none";
};

export function inspectPhotoDate(input: {
  bytes?: ArrayBuffer;
  lastModified?: number;
  localDay: string;
  tzOffsetMinutes?: number;
}): PhotoDateCheck {
  const exifDay = input.bytes ? readExifTakenDay(input.bytes) : null;
  if (exifDay) {
    return { takenDay: exifDay, verified: true, reason: "exif" };
  }
  if (typeof input.lastModified === "number" && Number.isFinite(input.lastModified)) {
    const takenDay =
      typeof input.tzOffsetMinutes === "number" && isValidTzOffset(input.tzOffsetMinutes)
        ? dayFromUnixMsWithOffset(input.lastModified, input.tzOffsetMinutes)
        : dayFromUnixMs(input.lastModified);
    return {
      takenDay,
      verified: false,
      reason: "file",
    };
  }
  return { takenDay: null, verified: false, reason: "none" };
}

export const PHOTO_DATE_MESSAGES = {
  old: "This photo looks older than today. Tonight only holds today's moment.",
  unverified:
    "We couldn't confirm a camera date. Only today's moment counts — we'll save it as today.",
  missing:
    "We couldn't read when this photo was made. Only today's moment counts.",
} as const;
