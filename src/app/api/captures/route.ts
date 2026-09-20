import { ingestGood } from "@/lib/ingest";
import { todayStamp, newId } from "@/lib/identity";
import { badRequest, json } from "@/lib/http";
import { loadSessionVault, toPublicSession } from "@/lib/session";
import { putBytes } from "@/lib/storage";
import { addCapture, capturesForDay } from "@/lib/vault";
import type { CaptureKind } from "@/lib/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

const KINDS = new Set<CaptureKind>(["voice", "photo", "text"]);

export async function GET(request: Request) {
  const url = new URL(request.url);
  const day = url.searchParams.get("day") || todayStamp();
  const { sessionId, vault } = await loadSessionVault();
  return json({
    session: toPublicSession(vault, sessionId, day),
    captures: capturesForDay(vault, day),
  });
}

export async function POST(request: Request) {
  const { sessionId, vault } = await loadSessionVault();
  const form = await request.formData();
  const kind = String(form.get("kind") ?? "") as CaptureKind;
  if (!KINDS.has(kind)) return badRequest("kind must be voice, photo, or text");

  const day = String(form.get("day") ?? todayStamp());
  const text = String(form.get("text") ?? "").trim() || undefined;
  const transcript = String(form.get("transcript") ?? "").trim() || undefined;
  const caption = String(form.get("caption") ?? "").trim() || undefined;
  const file = form.get("file");

  if (kind === "text" && !text) return badRequest("Write a moment first.");
  if (kind === "voice" && !transcript && !caption && !text) {
    return badRequest(
      "Type a line about what you said — we need your words to tell tonight's story.",
    );
  }

  const id = newId("cap");
  let mediaKey: string | undefined;
  let mediaContentType: string | undefined;
  let imageDataUrl: string | undefined;

  if (file instanceof File && file.size > 0) {
    if (file.size > 4.5 * 1024 * 1024) return badRequest("Keep files under 4.5 MB.");
    const bytes = Buffer.from(await file.arrayBuffer());
    mediaContentType = file.type || "application/octet-stream";
    const ext = extensionFor(mediaContentType, kind);
    mediaKey = `vaults/${vault.id}/media/${id}.${ext}`;
    await putBytes(mediaKey, bytes, mediaContentType);
    if (kind === "photo" && mediaContentType.startsWith("image/")) {
      imageDataUrl = `data:${mediaContentType};base64,${bytes.toString("base64")}`;
    }
  } else if (kind !== "text") {
    // Voice/photo without a file is still a valid moment if there is a transcript or caption.
    if (!transcript && !caption && !text) {
      return badRequest("Add a voice, photo, or a short caption.");
    }
  }

  const ingest = await ingestGood({
    kind,
    text,
    transcript,
    caption,
    imageDataUrl,
  });

  const capture = await addCapture(vault, {
    id,
    kind,
    createdAt: new Date().toISOString(),
    day,
    text,
    transcript,
    caption,
    goodMoment: ingest.goodMoment,
    mediaKey,
    mediaContentType,
    ingestModel: ingest.model,
    ingestStatus: ingest.status,
  });

  return json({
    capture,
    session: toPublicSession(vault, sessionId, day),
  });
}

function extensionFor(contentType: string, kind: CaptureKind): string {
  if (contentType.includes("png")) return "png";
  if (contentType.includes("webp")) return "webp";
  if (contentType.includes("jpeg") || contentType.includes("jpg")) return "jpg";
  if (contentType.includes("webm")) return "webm";
  if (contentType.includes("ogg")) return "ogg";
  if (contentType.includes("mp4")) return "mp4";
  if (contentType.includes("mpeg") || contentType.includes("mp3")) return "mp3";
  if (contentType.includes("wav")) return "wav";
  return kind === "photo" ? "bin" : "webm";
}
