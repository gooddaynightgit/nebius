import { LANDING, PHOTO_MAX_BYTES } from "./landing";

export const UPLOAD_MAX_EDGE = 1920;
export const UPLOAD_TARGET_BYTES = Math.floor(1.35 * 1024 * 1024);
export const HEIC_ASK = LANDING.app.heicAsk;

const QUALITIES = [0.82, 0.7, 0.58, 0.46];
const SHRINK_EDGES = [UPLOAD_MAX_EDGE, 1600, 1280];

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

export function isHeicLike(file: { type?: string; name?: string }): boolean {
  const type = (file.type || "").toLowerCase();
  const name = (file.name || "").toLowerCase();
  return /image\/hei[cf]/.test(type) || /\.hei[cf]s?$/i.test(name);
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

function loadHtmlImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () =>
      reject(new Error("Could not read that photo. Try a JPEG or PNG."));
    image.src = url;
  });
}

async function browserDecode(file: File): Promise<DecodedPhoto> {
  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(file);
      return {
        width: bitmap.width,
        height: bitmap.height,
        source: bitmap,
        close: () => bitmap.close(),
      };
    } catch {
      // HEIC and some camera stills fail here; try an <img> next.
    }
  }
  if (typeof Image === "undefined" || typeof URL === "undefined") {
    throw new Error("Could not read that photo. Try a JPEG or PNG.");
  }
  const url = URL.createObjectURL(file);
  try {
    const image = await loadHtmlImage(url);
    return {
      width: image.naturalWidth || image.width,
      height: image.naturalHeight || image.height,
      source: image,
    };
  } finally {
    URL.revokeObjectURL(url);
  }
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
  let decoded: DecodedPhoto;
  try {
    decoded = await codec.decode(file);
  } catch (error) {
    if (isHeicLike(file)) throw new Error(HEIC_ASK);
    throw error instanceof Error ? error : new Error("Could not read that photo. Try a JPEG or PNG.");
  }

  try {
    if (!decoded.width || !decoded.height) {
      throw new Error("Could not read that photo. Try a JPEG or PNG.");
    }
    const fitted = fitWithin(decoded.width, decoded.height);
    const alreadyFits =
      /image\/jpe?g/i.test(file.type) &&
      file.size <= UPLOAD_TARGET_BYTES &&
      fitted.width === decoded.width &&
      fitted.height === decoded.height;
    if (alreadyFits) return file;

    const blob = await encodeJpegUntil(decoded, codec.encode);
    if (blob.size > PHOTO_MAX_BYTES) {
      throw new Error(LANDING.app.tooLargeKeep);
    }
    return new File([blob], jpegFileName(file.name), {
      type: "image/jpeg",
      lastModified: file.lastModified || Date.now(),
    });
  } finally {
    decoded.close?.();
  }
}
