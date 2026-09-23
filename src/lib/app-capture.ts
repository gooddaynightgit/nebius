import { isPlausibleClientDay } from "./day";
import { getJoyById, PHOTO_MAX_BYTES, WHISPER_MAX } from "./landing";
import {
  inspectPhotoDate,
  isImageMime,
  isVideoMime,
  looksLikeBorrowedName,
  looksLikeMemeName,
  PHOTO_DATE_MESSAGES,
} from "./photo";
import { isHorrificFilename, isHorrificText, SAFETY_REFUSAL } from "./safety-text";

export function oneLineCaption(value: string): string {
  return value.replace(/[\r\n]+/g, " ").replace(/\s+/g, " ").trim();
}

export function clipCaption(value: string): string {
  return oneLineCaption(value).slice(0, WHISPER_MAX);
}

export function isEssayCaption(value: string): boolean {
  const line = oneLineCaption(value);
  if (!line) return false;
  if (/\b(1[\).:]|2[\).:]|3[\).:])/.test(line)) return true;
  if (/\b(grateful|gratitude)\b/i.test(line) && (/,.*,/.test(line) || /\b(and|then)\b.*,/.test(line))) {
    return true;
  }
  if (/\bdear (diary|journal)\b|\bjournal entry\b/i.test(line)) return true;
  const sentences = line.split(/[.!?]+\s+/).filter((part) => part.trim().length > 8);
  return sentences.length >= 3;
}

export type CaptionDisposition = {
  caption: string;
  dropped: boolean;
  reason?: "blocked" | "essay";
};

export function captionDisposition(value: string): CaptionDisposition {
  const line = clipCaption(value);
  if (!line) return { caption: "", dropped: false };
  if (isHorrificText(line)) return { caption: "", dropped: true, reason: "blocked" };
  if (isEssayCaption(line)) return { caption: "", dropped: true, reason: "essay" };
  return { caption: line, dropped: false };
}

export function appPhotoRejection(input: {
  day: string;
  joyId: string;
  caption: string;
  mime: string;
  filename: string;
  size: number;
  takenDay: string | null;
  /** True only when EXIF confirmed the camera day. Unverified dates save as today. */
  dateVerified?: boolean;
}): string | null {
  if (!isPlausibleClientDay(input.day)) return "Use today's date on your phone.";
  if (!getJoyById(input.joyId)) return "Pick the kind of quiet joy first.";
  if (!input.size) return "Add one photo from today.";
  if (input.size > PHOTO_MAX_BYTES) return "Keep photos under 4.5 MB.";
  if (isVideoMime(input.mime)) {
    return "Videos aren't saved. Extract one still frame and try again.";
  }
  if (!isImageMime(input.mime)) return "Choose a photo — a still from the day.";
  if (looksLikeMemeName(input.filename)) {
    return "Tonight is for your own moment, not a meme.";
  }
  if (looksLikeBorrowedName(input.filename)) {
    return "Tonight is for your own moment — not someone else's picture.";
  }
  if (input.dateVerified && input.takenDay && input.takenDay !== input.day) {
    return PHOTO_DATE_MESSAGES.old;
  }
  if (isHorrificFilename(input.filename)) {
    return SAFETY_REFUSAL;
  }
  return null;
}

export function photoDateForSave(input: {
  bytes: ArrayBuffer;
  lastModified?: number;
  localDay: string;
  tzOffsetMinutes?: number;
}) {
  return inspectPhotoDate(input);
}
