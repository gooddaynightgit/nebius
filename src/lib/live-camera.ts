export function prefersLiveCamera(input?: {
  secure?: boolean;
  hasGetUserMedia?: boolean;
  userAgent?: string;
  maxTouchPoints?: number;
}): boolean {
  const secure =
    input?.secure ?? (typeof window !== "undefined" && window.isSecureContext);
  const hasGetUserMedia =
    input?.hasGetUserMedia ??
    Boolean(typeof navigator !== "undefined" && navigator.mediaDevices?.getUserMedia);
  const userAgent =
    input?.userAgent ?? (typeof navigator !== "undefined" ? navigator.userAgent : "");
  const maxTouchPoints =
    input?.maxTouchPoints ?? (typeof navigator !== "undefined" ? navigator.maxTouchPoints : 0);
  if (!secure || !hasGetUserMedia) return false;
  return /Android|iPhone|iPad|iPod/i.test(userAgent) || maxTouchPoints > 1;
}

export async function openRearCamera(): Promise<MediaStream> {
  const attempts: MediaStreamConstraints[] = [
    { audio: false, video: { facingMode: { ideal: "environment" } } },
    { audio: false, video: true },
  ];
  let last: unknown;
  for (const constraints of attempts) {
    try {
      return await navigator.mediaDevices.getUserMedia(constraints);
    } catch (error) {
      last = error;
    }
  }
  throw last instanceof Error ? last : new Error("Could not open the camera.");
}

function jpegBlobFromDataUrl(dataUrl: string): Blob {
  const comma = dataUrl.indexOf(",");
  const base64 = comma >= 0 ? dataUrl.slice(comma + 1) : "";
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: "image/jpeg" });
}

export async function jpegBlobFromCanvas(canvas: HTMLCanvasElement, quality = 0.92): Promise<Blob> {
  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob((next) => resolve(next), "image/jpeg", quality);
  });
  if (blob && blob.size > 0) {
    const bytes = await blob.arrayBuffer();
    return new Blob([bytes], { type: "image/jpeg" });
  }
  const dataUrl = canvas.toDataURL("image/jpeg", quality);
  if (!dataUrl.startsWith("data:image/jpeg")) {
    throw new Error("Could not keep a still from the camera.");
  }
  return jpegBlobFromDataUrl(dataUrl);
}

export async function stillFromLiveVideo(video: HTMLVideoElement): Promise<File> {
  const canvas = document.createElement("canvas");
  canvas.width = video.videoWidth || 720;
  canvas.height = video.videoHeight || 720;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not keep a still from the camera.");
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  const blob = await jpegBlobFromCanvas(canvas, 0.92);
  return new File([blob], "moment.jpg", {
    type: "image/jpeg",
    lastModified: Date.now(),
  });
}
