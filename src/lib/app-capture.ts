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
  return value.replace(/\s+/g, " ").trim();
}

export function appPhotoRejection(input: {
  day: string;
  joyId: string;
  caption: string;
  mime: string;
  filename: string;
  size: number;
  takenDay: string | null;
}): string | null {
  if (!isPlausibleClientDay(input.day)) return "Use today's date on your phone.";
  if (!getJoyById(input.joyId)) return "Pick the kind of quiet joy first.";
  if (input.caption.length > WHISPER_MAX) {
    return `Keep the caption to ${WHISPER_MAX} characters.`;
  }
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
  if (input.takenDay && input.takenDay !== input.day) {
    return PHOTO_DATE_MESSAGES.old;
  }
  if (isHorrificText(input.caption) || isHorrificFilename(input.filename)) {
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
