import { describe, expect, it } from "vitest";
import {
  inspectPhotoDate,
  isImageMime,
  isVideoMime,
  looksLikeBorrowedName,
  looksLikeMemeName,
  PHOTO_DATE_MESSAGES,
  PHOTO_SAVE_RULES,
  readExifTakenDay,
} from "./photo";

function jpegWithExifDate(date = "2026:09:21 08:00:00"): ArrayBuffer {
  const tiff = Buffer.alloc(64);
  tiff.write("II", 0);
  tiff.writeUInt16LE(42, 2);
  tiff.writeUInt32LE(8, 4);
  tiff.writeUInt16LE(1, 8);
  tiff.writeUInt16LE(0x8769, 10);
  tiff.writeUInt16LE(4, 12);
  tiff.writeUInt32LE(1, 14);
  tiff.writeUInt32LE(26, 18);
  tiff.writeUInt32LE(0, 22);
  tiff.writeUInt16LE(1, 26);
  tiff.writeUInt16LE(0x9003, 28);
  tiff.writeUInt16LE(2, 30);
  tiff.writeUInt32LE(20, 32);
  tiff.writeUInt32LE(44, 36);
  tiff.writeUInt32LE(0, 40);
  tiff.write(`${date}\0`, 44, 20, "ascii");
  const payload = Buffer.concat([Buffer.from("Exif\0\0"), tiff]);
  const size = payload.length + 2;
  const jpeg = Buffer.concat([
    Buffer.from([0xff, 0xd8, 0xff, 0xe1, (size >> 8) & 0xff, size & 0xff]),
    payload,
    Buffer.from([0xff, 0xd9]),
  ]);
  return jpeg.buffer.slice(jpeg.byteOffset, jpeg.byteOffset + jpeg.byteLength) as ArrayBuffer;
}

describe("photo save rules copy", () => {
  it("keeps Jasmine’s ten rules exact and drops the soft date note", () => {
    expect(PHOTO_SAVE_RULES).toEqual([
      "Several photos can be saved in one calendar day (midnight–23:59, phone’s local time). Each saved moment is its own story.",
      "The photo is required. No photo, no save, no good moment.",
      "When from today — camera roll today, message: Wonderful, your photo was taken today.",
      "Screenshots count: a hello, a gift message, a tracker, a watch face.",
      "A video is not saved. Ask for a picture of the moment instead.",
      "One joy pick is required (sunlight, hello, slow task, movement, clear corner, or just this).",
      "Ugly, blurry, messy, and ordinary photos are allowed.",
      "Sad or hard photos are allowed. The story stays honest and gentle.",
      "Horrific photos are not saved and get no story (violence, gore, abuse, porn, hate, self-harm).",
      "Not allowed: memes, someone else’s moment passed off as yours.",
    ]);
    expect(PHOTO_DATE_MESSAGES.today).toBe("Wonderful, your photo was taken today.");
    expect(PHOTO_DATE_MESSAGES.old).toBe(
      "This photo looks older than today. Tonight only holds today's moment.",
    );
    expect(JSON.stringify(PHOTO_DATE_MESSAGES)).not.toMatch(/couldn't confirm/i);
    expect(JSON.stringify(PHOTO_SAVE_RULES)).not.toMatch(/\bstock\b|\bold photos\b/i);
  });
});

describe("photo checks", () => {
  it("tells images from video and flags meme or stock names", () => {
    expect(isImageMime("image/jpeg")).toBe(true);
    expect(isImageMime("image/png; charset=binary")).toBe(true);
    expect(isVideoMime("video/mp4")).toBe(true);
    expect(looksLikeMemeName("funny-meme.gif")).toBe(true);
    expect(looksLikeBorrowedName("unsplash-sky.jpg")).toBe(true);
    expect(looksLikeMemeName("kettle.jpg")).toBe(false);
  });

  it("reads DateTimeOriginal from a JPEG and rejects older file dates", () => {
    const bytes = jpegWithExifDate("2026:09:20 09:00:00");
    expect(readExifTakenDay(bytes)).toBe("2026-09-20");
    const check = inspectPhotoDate({
      bytes,
      lastModified: Date.parse("2026-09-21T12:00:00.000Z"),
      localDay: "2026-09-21",
      tzOffsetMinutes: 0,
    });
    expect(check).toEqual({ takenDay: "2026-09-20", verified: true, reason: "exif" });
  });

  it("falls back to lastModified when EXIF is missing", () => {
    const check = inspectPhotoDate({
      lastModified: Date.parse("2026-09-21T18:00:00.000Z"),
      localDay: "2026-09-21",
      tzOffsetMinutes: 0,
    });
    expect(check.takenDay).toBe("2026-09-21");
    expect(check.verified).toBe(false);
    expect(check.reason).toBe("file");
  });
});
