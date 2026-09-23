export const KEEP_CARD = {
  width: 1080,
  padding: 64,
  photoRatio: 4 / 5,
  radius: 36,
  backgroundTop: "#ebe7fb",
  backgroundBottom: "#f7f3e4",
  panel: "#f0f0ff",
  ink: "#16324a",
  muted: "#3d5a6e",
  brand: "gooddaynight.com",
  storyFontSize: 36,
  storyLineHeight: 52,
  jpegQuality: 0.92,
} as const;

export type KeepCardBox = { x: number; y: number; width: number; height: number };

export type KeepCardLayout = {
  width: number;
  height: number;
  photo: KeepCardBox;
  story: KeepCardBox;
  brandY: number;
  lineHeight: number;
};

export function keepCardFilename(day: string): string {
  return `gooddaynight-${day}.jpg`;
}

export function keepCardPhotoSrc(photoId: string, bust?: string): string {
  const base = `/api/media/${encodeURIComponent(photoId)}`;
  return bust ? `${base}?t=${encodeURIComponent(bust)}` : base;
}

export function wrapKeepCardLines(
  text: string,
  measure: (line: string) => number,
  maxWidth: number,
): string[] {
  const paragraphs = text.replace(/\r\n/g, "\n").split("\n");
  const lines: string[] = [];
  for (const paragraph of paragraphs) {
    const words = paragraph.trim().split(/\s+/).filter(Boolean);
    if (!words.length) {
      lines.push("");
      continue;
    }
    let current = "";
    for (const word of words) {
      const pieces = splitLongWord(word, measure, maxWidth);
      for (const piece of pieces) {
        const next = current ? `${current} ${piece}` : piece;
        if (measure(next) <= maxWidth) {
          current = next;
          continue;
        }
        if (current) lines.push(current);
        current = piece;
      }
    }
    if (current) lines.push(current);
  }
  return lines.length ? lines : [""];
}

function splitLongWord(
  word: string,
  measure: (line: string) => number,
  maxWidth: number,
): string[] {
  if (measure(word) <= maxWidth) return [word];
  const parts: string[] = [];
  let rest = word;
  while (rest.length) {
    let low = 1;
    let high = rest.length;
    while (low < high) {
      const mid = Math.ceil((low + high) / 2);
      if (measure(rest.slice(0, mid)) <= maxWidth) low = mid;
      else high = mid - 1;
    }
    parts.push(rest.slice(0, low));
    rest = rest.slice(low);
  }
  return parts;
}

export function layoutKeepCard(input: {
  lineCount: number;
  lineHeight?: number;
}): KeepCardLayout {
  const pad = KEEP_CARD.padding;
  const width = KEEP_CARD.width;
  const inner = width - pad * 2;
  const photoHeight = Math.round(inner * KEEP_CARD.photoRatio);
  const lineHeight = input.lineHeight ?? KEEP_CARD.storyLineHeight;
  const brandY = pad + 8;
  const photoY = pad + 48;
  const storyY = photoY + photoHeight + 40;
  const storyHeight = Math.max(lineHeight, input.lineCount * lineHeight);
  const height = storyY + storyHeight + pad + 56;
  return {
    width,
    height,
    photo: { x: pad, y: photoY, width: inner, height: photoHeight },
    story: { x: pad, y: storyY, width: inner, height: storyHeight },
    brandY,
    lineHeight,
  };
}

type SizedSource = CanvasImageSource & { width: number; height: number };

function sourceSize(photo: SizedSource | HTMLImageElement): { width: number; height: number } {
  const image = photo as HTMLImageElement;
  return {
    width: image.naturalWidth || photo.width,
    height: image.naturalHeight || photo.height,
  };
}

function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

function drawCoverPhoto(
  ctx: CanvasRenderingContext2D,
  photo: SizedSource,
  box: KeepCardBox,
) {
  const { width, height } = sourceSize(photo);
  if (!width || !height) return;
  const scale = Math.max(box.width / width, box.height / height);
  const dw = width * scale;
  const dh = height * scale;
  const dx = box.x + (box.width - dw) / 2;
  const dy = box.y + (box.height - dh) / 2;
  ctx.save();
  roundedRect(ctx, box.x, box.y, box.width, box.height, KEEP_CARD.radius);
  ctx.clip();
  ctx.drawImage(photo, dx, dy, dw, dh);
  ctx.restore();
}

export async function loadKeepCardPhoto(src: string): Promise<SizedSource> {
  const res = await fetch(src, { credentials: "same-origin" });
  if (!res.ok) throw new Error("Could not open tonight’s photo.");
  const blob = await res.blob();
  if (typeof createImageBitmap === "function") {
    return createImageBitmap(blob);
  }
  return decodeImageElement(blob);
}

function decodeImageElement(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not open tonight’s photo."));
    };
    image.src = url;
  });
}

export async function composeKeepCardJpeg(input: {
  photo: SizedSource | HTMLImageElement;
  story: string;
}): Promise<Blob> {
  if (typeof document === "undefined") {
    throw new Error("Keep needs a screen.");
  }
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not keep tonight’s story.");
  ctx.font = `500 ${KEEP_CARD.storyFontSize}px Inter, "Segoe UI", "Helvetica Neue", sans-serif`;
  const lines = wrapKeepCardLines(
    input.story,
    (line) => ctx.measureText(line).width,
    KEEP_CARD.width - KEEP_CARD.padding * 2,
  );
  const layout = layoutKeepCard({ lineCount: lines.length, lineHeight: KEEP_CARD.storyLineHeight });
  canvas.width = layout.width;
  canvas.height = layout.height;

  const wash = ctx.createLinearGradient(0, 0, 0, layout.height);
  wash.addColorStop(0, KEEP_CARD.backgroundTop);
  wash.addColorStop(1, KEEP_CARD.backgroundBottom);
  ctx.fillStyle = wash;
  ctx.fillRect(0, 0, layout.width, layout.height);

  ctx.fillStyle = KEEP_CARD.ink;
  ctx.font = `800 28px Inter, "Segoe UI", "Helvetica Neue", sans-serif`;
  ctx.fillText(KEEP_CARD.brand, layout.photo.x, layout.brandY + 24);

  drawCoverPhoto(ctx, input.photo, layout.photo);

  ctx.fillStyle = KEEP_CARD.panel;
  roundedRect(
    ctx,
    layout.story.x - 8,
    layout.story.y - 24,
    layout.story.width + 16,
    layout.story.height + 48,
    28,
  );
  ctx.fill();

  ctx.fillStyle = KEEP_CARD.ink;
  ctx.font = `500 ${KEEP_CARD.storyFontSize}px Inter, "Segoe UI", "Helvetica Neue", sans-serif`;
  ctx.textBaseline = "top";
  lines.forEach((line, index) => {
    ctx.fillText(line, layout.story.x, layout.story.y + index * layout.lineHeight);
  });

  return canvasToJpeg(canvas, KEEP_CARD.jpegQuality);
}

function canvasToJpeg(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Could not keep tonight’s story."))),
      "image/jpeg",
      quality,
    );
  });
}

export function keepCardFile(blob: Blob, filename: string): File {
  return new File([blob], filename, { type: "image/jpeg" });
}

export function canShareKeepCard(file: File): boolean {
  if (typeof navigator === "undefined" || typeof navigator.share !== "function") return false;
  if (typeof navigator.canShare !== "function") return false;
  try {
    return navigator.canShare({ files: [file] });
  } catch {
    return false;
  }
}

export function triggerKeepCardDownload(blob: Blob, filename: string): void {
  if (typeof document === "undefined") throw new Error("Keep needs a screen.");
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.rel = "noopener";
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);
}

export async function shareOrDownloadKeepCard(input: {
  blob: Blob;
  filename: string;
  title?: string;
}): Promise<"shared" | "downloaded" | "cancelled"> {
  const file = keepCardFile(input.blob, input.filename);
  if (canShareKeepCard(file)) {
    try {
      await navigator.share({ files: [file], title: input.title ?? "My good moment" });
      return "shared";
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return "cancelled";
    }
  }
  triggerKeepCardDownload(input.blob, input.filename);
  return "downloaded";
}
