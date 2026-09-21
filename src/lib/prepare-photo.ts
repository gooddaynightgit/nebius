import { LANDING, PHOTO_MAX_BYTES } from "./landing";

export const UPLOAD_MAX_EDGE = 1920;
export const UPLOAD_TARGET_BYTES = Math.floor(1.35 * 1024 * 1024);
export const HEIC_ASK = LANDING.app.heicAsk;
export const PHOTO_UNREADABLE = "Could not read that photo. Try a JPEG or PNG.";
export const PHOTO_UNSUPPORTED = "That photo format isn't supported here. Try a JPEG or PNG.";

const QUALITIES = [0.82, 0.7, 0.58, 0.46];
const SHRINK_EDGES = [UPLOAD_MAX_EDGE, 1600, 1280];
const HEIC_BRANDS = new Set(["heic", "heix", "heif", "heis", "heim", "hevc", "hevx", "mif1", "msf1"]);
const AVIF_BRANDS = new Set(["avif", "avis", "avio"]);

export type SniffedPhotoKind =
  | "jpeg"
  | "png"
  | "webp"
  | "gif"
  | "heic"
  | "avif"
  | "bmp"
  | "tiff"
  | "unknown";

export type DecodedPhoto = {
  width: number;
  height: number;
  source?: CanvasImageSource;
  close?: () => void;
};

export type PhotoCodec = {
  decode(file: File): Promise<DecodedPhoto>;
  encode(
    decoded: DecodedPhoto,
    width: number,
    height: number,
    quality: number,
  ): Promise<Blob>;
};

const MIME_FOR_KIND: Record<SniffedPhotoKind, string> = {
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  heic: "image/heic",
  avif: "image/avif",
  bmp: "image/bmp",
  tiff: "image/tiff",
  unknown: "",
};

const EXT_FOR_KIND: Record<SniffedPhotoKind, string> = {
  jpeg: "jpg",
  png: "png",
  webp: "webp",
  gif: "gif",
  heic: "heic",
  avif: "avif",
  bmp: "bmp",
  tiff: "tiff",
  unknown: "",
};

const DECODEABLE_KINDS = new Set<SniffedPhotoKind>(["jpeg", "png", "webp", "gif"]);

export function isHeicLike(file: { type?: string; name?: string }): boolean {
  const type = (file.type || "").toLowerCase();
  const name = (file.name || "").toLowerCase();
  return /image\/hei[cf]/.test(type) || /\.hei[cf]s?$/i.test(name);
}

export function isVaguePhotoType(type?: string): boolean {
  const normalized = (type || "").toLowerCase().split(";")[0]?.trim() ?? "";
  return (
    !normalized ||
    normalized === "application/octet-stream" ||
    normalized === "binary/octet-stream" ||
    normalized === "application/download" ||
    normalized === "application/x-download" ||
    normalized === "application/force-download"
  );
}

export function jpegFileName(name: string): string {
  const stem = (name || "moment").replace(/\.[^.]+$/, "") || "moment";
  return `${stem}.jpg`;
}

export function fitWithin(
  width: number,
  height: number,
  maxEdge = UPLOAD_MAX_EDGE,
): { width: number; height: number } {
  const w = Math.max(1, Math.round(width) || 1);
  const h = Math.max(1, Math.round(height) || 1);
  const edge = Math.max(w, h);
  if (edge <= maxEdge) return { width: w, height: h };
  const scale = maxEdge / edge;
  return {
    width: Math.max(1, Math.round(w * scale)),
    height: Math.max(1, Math.round(h * scale)),
  };
}

function ascii(bytes: Uint8Array, offset: number, length: number): string {
  const end = Math.min(bytes.length, offset + length);
  let out = "";
  for (let i = offset; i < end; i += 1) out += String.fromCharCode(bytes[i] ?? 0);
  return out;
}

function ftypBrands(bytes: Uint8Array): string[] {
  if (bytes.length < 16 || ascii(bytes, 4, 4) !== "ftyp") return [];
  const size = ((bytes[0] ?? 0) << 24) | ((bytes[1] ?? 0) << 16) | ((bytes[2] ?? 0) << 8) | (bytes[3] ?? 0);
  const end = Math.min(bytes.length, size >= 16 ? size : bytes.length);
  const brands = [ascii(bytes, 8, 4).trim().toLowerCase()];
  for (let i = 16; i + 4 <= end; i += 4) {
    brands.push(ascii(bytes, i, 4).trim().toLowerCase());
  }
  return brands.filter(Boolean);
}

export function sniffPhotoBytes(input: ArrayBuffer | ArrayBufferView): SniffedPhotoKind {
  const bytes =
    input instanceof Uint8Array
      ? input
      : input instanceof ArrayBuffer
        ? new Uint8Array(input)
        : new Uint8Array(input.buffer, input.byteOffset, input.byteLength);
  if (bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xd8) return "jpeg";
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return "png";
  }
  if (bytes.length >= 12 && ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 4) === "WEBP") {
    return "webp";
  }
  if (bytes.length >= 6 && (ascii(bytes, 0, 6) === "GIF87a" || ascii(bytes, 0, 6) === "GIF89a")) {
    return "gif";
  }
  if (bytes.length >= 2 && ascii(bytes, 0, 2) === "BM") return "bmp";
  if (
    bytes.length >= 4 &&
    (ascii(bytes, 0, 4) === "II*\0" || ascii(bytes, 0, 4) === "MM\0*")
  ) {
    return "tiff";
  }
  const brands = ftypBrands(bytes);
  if (brands.some((brand) => AVIF_BRANDS.has(brand))) return "avif";
  if (brands.some((brand) => HEIC_BRANDS.has(brand))) return "heic";
  return "unknown";
}

export function mimeForSniffedKind(kind: SniffedPhotoKind): string {
  return MIME_FOR_KIND[kind];
}

function normalizeMime(type?: string): string {
  const normalized = (type || "").toLowerCase().split(";")[0]?.trim() ?? "";
  if (normalized === "image/jpg") return "image/jpeg";
  return normalized;
}

function nameWithPhotoExt(name: string, kind: SniffedPhotoKind): string {
  const ext = EXT_FOR_KIND[kind];
  const raw = name || "moment";
  const stem = raw.replace(/\.[^.]+$/, "") || "moment";
  if (!ext) return raw === "blob" ? "moment" : raw;
  return `${stem}.${ext}`;
}

function asArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

function fileFromBytes(
  bytes: Uint8Array,
  name: string,
  type: string,
  lastModified?: number,
): File {
  return new File([asArrayBuffer(bytes)], name, {
    type,
    lastModified: lastModified || Date.now(),
  });
}

export async function copyAsJpegFile(
  blob: Blob,
  name = "moment.jpg",
  lastModified?: number,
): Promise<File> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  return fileFromBytes(bytes, jpegFileName(name), "image/jpeg", lastModified || Date.now());
}

type PhotoSource = {
  file: File;
  kind: SniffedPhotoKind;
  bytes: Uint8Array;
};

async function readPhotoSource(file: File): Promise<PhotoSource> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const kind = sniffPhotoBytes(bytes);
  const sniffedMime = mimeForSniffedKind(kind);
  const currentMime = normalizeMime(file.type);
  const shouldRetype = Boolean(sniffedMime) && (isVaguePhotoType(file.type) || currentMime !== sniffedMime);
  const name = shouldRetype ? nameWithPhotoExt(file.name, kind) : file.name || nameWithPhotoExt("moment", kind);
  const type = shouldRetype ? sniffedMime : currentMime || sniffedMime;
  return {
    kind,
    bytes,
    file: fileFromBytes(bytes, name || "moment", type, file.lastModified),
  };
}

export async function normalizePhotoFile(file: File): Promise<File> {
  const source = await readPhotoSource(file);
  return source.file;
}

export async function jpegFileForCameraStill(file: File): Promise<File> {
  const source = await readPhotoSource(file);
  if (source.kind === "jpeg" || /image\/jpe?g/i.test(source.file.type)) {
    return fileFromBytes(
      source.bytes,
      jpegFileName(source.file.name || "moment.jpg"),
      "image/jpeg",
      source.file.lastModified,
    );
  }
  return source.file;
}

function looksLikeHeic(source: PhotoSource): boolean {
  if (source.kind === "heic") return true;
  if (DECODEABLE_KINDS.has(source.kind)) return false;
  return isHeicLike(source.file);
}

function decodeErrorFor(source: PhotoSource): Error {
  if (looksLikeHeic(source)) return new Error(HEIC_ASK);
  if (source.kind === "jpeg" && source.file.size > PHOTO_MAX_BYTES) {
    return new Error(LANDING.app.tooLargeKeep);
  }
  if (DECODEABLE_KINDS.has(source.kind) || source.kind === "unknown") {
    return new Error(PHOTO_UNREADABLE);
  }
  return new Error(PHOTO_UNSUPPORTED);
}

function canPassThroughJpeg(source: PhotoSource): boolean {
  return source.kind === "jpeg" && source.file.size > 0 && source.file.size <= PHOTO_MAX_BYTES;
}

function jpegPassThrough(source: PhotoSource): File {
  return fileFromBytes(
    source.bytes,
    jpegFileName(source.file.name || "moment.jpg"),
    "image/jpeg",
    source.file.lastModified,
  );
}

function loadHtmlImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(PHOTO_UNREADABLE));
    image.src = url;
  });
}

async function readFileAsDataUrl(file: Blob): Promise<string> {
  if (typeof FileReader === "undefined") throw new Error(PHOTO_UNREADABLE);
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error(PHOTO_UNREADABLE));
    reader.readAsDataURL(file);
  });
}

async function tryCreateImageBitmap(blob: Blob): Promise<ImageBitmap | null> {
  if (typeof createImageBitmap !== "function") return null;
  const attempts: unknown[] = [{ imageOrientation: "from-image" }, {}];
  for (const options of attempts) {
    try {
      const bitmap =
        options && Object.keys(options as object).length
          ? await createImageBitmap(blob, options as ImageBitmapOptions)
          : await createImageBitmap(blob);
      if (bitmap.width && bitmap.height) return bitmap;
      bitmap.close();
    } catch {
      // Android Chrome rejects some stills here; try the next decode path.
    }
  }
  return null;
}

async function tryHtmlImage(url: string): Promise<HTMLImageElement | null> {
  if (typeof Image === "undefined") return null;
  try {
    const image = await loadHtmlImage(url);
    if (image.naturalWidth || image.width) return image;
  } catch {
    return null;
  }
  return null;
}

async function browserDecode(file: File): Promise<DecodedPhoto> {
  const bitmap = await tryCreateImageBitmap(file);
  if (bitmap) {
    return {
      width: bitmap.width,
      height: bitmap.height,
      source: bitmap,
      close: () => bitmap.close(),
    };
  }

  if (typeof URL !== "undefined") {
    const objectUrl = URL.createObjectURL(file);
    try {
      const image = await tryHtmlImage(objectUrl);
      if (image) {
        return {
          width: image.naturalWidth || image.width,
          height: image.naturalHeight || image.height,
          source: image,
        };
      }
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  }

  const dataUrl = await readFileAsDataUrl(file);
  const image = await tryHtmlImage(dataUrl);
  if (image) {
    return {
      width: image.naturalWidth || image.width,
      height: image.naturalHeight || image.height,
      source: image,
    };
  }

  throw new Error(PHOTO_UNREADABLE);
}

async function browserEncode(
  decoded: DecodedPhoto,
  width: number,
  height: number,
  quality: number,
): Promise<Blob> {
  if (typeof document === "undefined" || !decoded.source) {
    throw new Error("Could not shrink that photo.");
  }
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { alpha: false });
  if (!ctx) throw new Error("Could not shrink that photo.");
  ctx.drawImage(decoded.source, 0, 0, width, height);
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Could not shrink that photo."))),
      "image/jpeg",
      quality,
    );
  });
}

const browserCodec: PhotoCodec = {
  decode: browserDecode,
  encode: browserEncode,
};

export async function encodeJpegUntil(
  decoded: DecodedPhoto,
  encode: PhotoCodec["encode"],
  targetBytes = UPLOAD_TARGET_BYTES,
): Promise<Blob> {
  let last: Blob | null = null;
  for (const edge of SHRINK_EDGES) {
    const fitted = fitWithin(decoded.width, decoded.height, edge);
    for (const quality of QUALITIES) {
      last = await encode(decoded, fitted.width, fitted.height, quality);
      if (last.size <= targetBytes) return last;
    }
  }
  if (!last) throw new Error(LANDING.app.tooLarge);
  return last;
}

export async function preparePhotoForUpload(file: File, codec: PhotoCodec = browserCodec): Promise<File> {
  const source = await readPhotoSource(file);
  if (looksLikeHeic(source)) throw new Error(HEIC_ASK);

  let decoded: DecodedPhoto;
  try {
    decoded = await codec.decode(source.file);
    if (!decoded.width || !decoded.height) {
      throw new Error(PHOTO_UNREADABLE);
    }
  } catch {
    if (looksLikeHeic(source)) throw new Error(HEIC_ASK);
    if (canPassThroughJpeg(source)) return jpegPassThrough(source);
    throw decodeErrorFor(source);
  }

  try {
    const fitted = fitWithin(decoded.width, decoded.height);
    const alreadyFits =
      /image\/jpe?g/i.test(source.file.type) &&
      source.file.size <= UPLOAD_TARGET_BYTES &&
      fitted.width === decoded.width &&
      fitted.height === decoded.height;
    if (alreadyFits) return source.file;

    const blob = await encodeJpegUntil(decoded, codec.encode);
    if (blob.size > PHOTO_MAX_BYTES) {
      throw new Error(LANDING.app.tooLargeKeep);
    }
    return new File([blob], jpegFileName(source.file.name), {
      type: "image/jpeg",
      lastModified: source.file.lastModified || Date.now(),
    });
  } finally {
    decoded.close?.();
  }
}
