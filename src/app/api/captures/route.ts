import { appPhotoRejection, captionDisposition } from "@/lib/app-capture";
import { chooseSpokenLine, proposeSpokenLine } from "@/lib/care";
import { ingestAppPhoto, ingestGood } from "@/lib/ingest";
import { newId, todayStamp } from "@/lib/identity";
import { LANDING, getJoyById, PHOTO_MAX_BYTES } from "@/lib/landing";
import { badRequest, forbidden, json } from "@/lib/http";
import { bufferToArrayBuffer, inspectPhotoDate, PHOTO_DATE_MESSAGES, type PhotoDateCheck } from "@/lib/photo";
import { inspectImageSafety, SAFETY_REFUSAL } from "@/lib/safety";
import { proposeSpellfix } from "@/lib/spellfix";
import { loadSessionVault, presentSession, toPublicSession } from "@/lib/session";
import { imageDataUrlForModels } from "@/lib/model-image";
import { putBytes } from "@/lib/storage";
import { addCapture, appPhotoForDay, capturesForDay, upsertAppPhoto } from "@/lib/vault";
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
    session: await presentSession(vault, sessionId, day),
    captures: capturesForDay(vault, day),
  });
}

export async function POST(request: Request) {
  const { sessionId, vault } = await loadSessionVault();
  const form = await request.formData();
  if (String(form.get("source") ?? "") === "app") {
    return saveAppPhoto(sessionId, vault, form);
  }

  const kind = String(form.get("kind") ?? "") as CaptureKind;
  if (!KINDS.has(kind)) return badRequest("kind must be voice, photo, or text");

  const day = String(form.get("day") ?? todayStamp());
  const decision = String(form.get("spellDecision") ?? "");
  const rawText = String(form.get("text") ?? "").replace(/\s+/g, " ").trim();
  const rawTranscript = String(form.get("transcript") ?? "").replace(/\s+/g, " ").trim();
  const rawCaption = String(form.get("caption") ?? "").replace(/\s+/g, " ").trim();
  const spokenRaw = rawTranscript || rawCaption || rawText;
  const proposal = spokenRaw ? await proposeSpellfix(spokenRaw) : proposeSpokenLine("");
  if (proposal.changed && decision !== "corrected" && decision !== "keep") {
    return json(
      {
        error: "Save corrected version?",
        needsConfirm: true,
        original: proposal.original,
        corrected: proposal.corrected,
      },
      409,
    );
  }
  const chosen = spokenRaw
    ? chooseSpokenLine(spokenRaw, decision || "none", proposal.corrected)
    : "";
  const primary = rawTranscript ? "transcript" : rawText ? "text" : rawCaption ? "caption" : null;
  const text = primary === "text" ? chosen || undefined : rawText || undefined;
  const transcript = primary === "transcript" ? chosen || undefined : rawTranscript || undefined;
  const caption = primary === "caption" ? chosen || undefined : rawCaption || undefined;
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
    if (file.size > PHOTO_MAX_BYTES) return badRequest("Keep files under 4.5 MB.");
    const bytes = Buffer.from(await file.arrayBuffer());
    mediaContentType = file.type || "application/octet-stream";
    const ext = extensionFor(mediaContentType, kind);
    mediaKey = `vaults/${vault.id}/media/${id}.${ext}`;
    await putBytes(mediaKey, bytes, mediaContentType);
    if (kind === "photo" && mediaContentType.startsWith("image/")) {
      imageDataUrl = imageDataUrlForModels(mediaContentType, bytes);
    }
  } else if (kind !== "text") {
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
    source: "landing",
    goodMoment: ingest.goodMoment,
    reframed: ingest.reframed,
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

async function saveAppPhoto(
  sessionId: string,
  vault: Awaited<ReturnType<typeof loadSessionVault>>["vault"],
  form: FormData,
) {
  const day = String(form.get("day") ?? "");
  const joyId = String(form.get("joyType") ?? "");
  const joy = getJoyById(joyId);
  const captionResult = captionDisposition(String(form.get("caption") ?? ""));
  const caption = captionResult.caption;
  const tzOffset = Number(form.get("tzOffset"));
  const file = form.get("file");
  const existing = appPhotoForDay(vault, day);

  const hasNewFile = file instanceof File && file.size > 0;
  if (!hasNewFile && !existing) {
    return badRequest("Add one photo from today.");
  }

  let bytes: Buffer | undefined;
  let mediaContentType = existing?.mediaContentType || "image/jpeg";
  let filename = "moment.jpg";
  let date: PhotoDateCheck = {
    takenDay: existing?.photoTakenAt ?? (existing ? day : null),
    verified: Boolean(existing?.dateVerified),
    reason: existing?.dateVerified ? "exif" : "none",
  };

  if (hasNewFile && file instanceof File) {
    filename = file.name || "moment.jpg";
    mediaContentType = file.type || "application/octet-stream";
    bytes = Buffer.from(await file.arrayBuffer());
    date = inspectPhotoDate({
      bytes: bufferToArrayBuffer(bytes),
      lastModified: file.lastModified,
      localDay: day,
      tzOffsetMinutes: tzOffset,
    });
  }

  const rejected = appPhotoRejection({
    day,
    joyId,
    caption,
    mime: mediaContentType,
    filename,
    size: hasNewFile && file instanceof File ? file.size : existing ? 1 : 0,
    takenDay: date.takenDay,
  });
  if (rejected) {
    return rejected === SAFETY_REFUSAL ? forbidden(rejected) : badRequest(rejected);
  }
  if (!joy) return badRequest("Pick the kind of quiet joy first.");

  const imageDataUrl =
    bytes && mediaContentType.startsWith("image/")
      ? imageDataUrlForModels(mediaContentType, bytes)
      : undefined;

  if (imageDataUrl) {
    const safety = await inspectImageSafety({
      filename,
      imageDataUrl,
    });
    if (!safety.safe) return forbidden(SAFETY_REFUSAL);
  }

  const id = existing?.id ?? newId("cap");
  let mediaKey = existing?.mediaKey;
  if (bytes) {
    const ext = extensionFor(mediaContentType, "photo");
    mediaKey = `vaults/${vault.id}/media/${id}.${ext}`;
    await putBytes(mediaKey, bytes, mediaContentType);
  }

  const ingest = await ingestAppPhoto({
    caption: caption || undefined,
    imageDataUrl,
    joyType: joy.id,
  });

  const capture = await upsertAppPhoto(vault, {
    id,
    kind: "photo",
    createdAt: existing?.createdAt ?? new Date().toISOString(),
    day,
    caption: caption || undefined,
    joyType: joy.id,
    source: "app",
    dateVerified: date.verified && date.takenDay === day,
    photoTakenAt: date.takenDay ?? undefined,
    locked: false,
    goodMoment: ingest.goodMoment,
    reframed: ingest.reframed,
    mediaKey,
    mediaContentType,
    ingestModel: ingest.model,
    ingestStatus: ingest.status,
  });
  return json({
    capture,
    session: await presentSession(vault, sessionId, day),
    dateNote: date.verified ? undefined : PHOTO_DATE_MESSAGES.unverified,
    captionNote: captionResult.dropped ? LANDING.app.captionDropped : undefined,
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
