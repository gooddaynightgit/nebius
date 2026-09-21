import { describe, expect, it } from "vitest";
import {
  encodeJpegUntil,
  fitWithin,
  isHeicLike,
  jpegFileName,
  preparePhotoForUpload,
  UPLOAD_MAX_EDGE,
  UPLOAD_TARGET_BYTES,
  type DecodedPhoto,
  type PhotoCodec,
} from "./prepare-photo";
import { LANDING, PHOTO_MAX_BYTES } from "./landing";

function blobOf(bytes: number, type = "image/jpeg"): Blob {
  return new Blob([new Uint8Array(Math.max(0, Math.floor(bytes)))], { type });
}

function fileOf(bytes: number, name = "phone.jpg", type = "image/jpeg"): File {
  return new File([blobOf(bytes, type)], name, { type, lastModified: Date.parse("2026-09-21T08:00:00.000Z") });
}

function codec(sizes: number[]): PhotoCodec {
  let index = 0;
  return {
    async decode(file) {
      return { width: 4000, height: 3000, source: undefined, close: () => undefined, name: file.name } as DecodedPhoto;
    },
    async encode(_decoded, width, height, quality) {
      const next = sizes[Math.min(index, sizes.length - 1)] ?? 0;
      index += 1;
      void width;
      void height;
      void quality;
      return blobOf(next);
    },
  };
}

describe("prepare photo for upload", () => {
  it("fits the long edge inside 1600–2048 without stretching", () => {
    expect(fitWithin(4000, 3000).width).toBe(UPLOAD_MAX_EDGE);
    expect(fitWithin(4000, 3000).height).toBe(1440);
    expect(fitWithin(1200, 800)).toEqual({ width: 1200, height: 800 });
    expect(fitWithin(800, 4000).height).toBe(UPLOAD_MAX_EDGE);
    expect(UPLOAD_MAX_EDGE).toBeGreaterThanOrEqual(1600);
    expect(UPLOAD_MAX_EDGE).toBeLessThanOrEqual(2048);
    expect(UPLOAD_TARGET_BYTES).toBeLessThanOrEqual(Math.floor(1.5 * 1024 * 1024));
    expect(UPLOAD_TARGET_BYTES).toBeGreaterThanOrEqual(Math.floor(1.2 * 1024 * 1024));
  });

  it("asks for JPEG/PNG when HEIC cannot be decoded", async () => {
    expect(isHeicLike({ type: "image/heic", name: "IMG_1234.HEIC" })).toBe(true);
    expect(isHeicLike({ type: "image/jpeg", name: "breakfast.jpg" })).toBe(false);
    expect(jpegFileName("Breakfast choc.HEIC")).toBe("Breakfast choc.jpg");
    await expect(
      preparePhotoForUpload(fileOf(2_000_000, "moment.heic", "image/heic"), {
        async decode() {
          throw new Error("could not decode");
        },
        async encode() {
          return blobOf(10);
        },
      }),
    ).rejects.toThrow(LANDING.app.heicAsk);
  });

  it("compresses a multi-megabyte phone still under the upload target", async () => {
    const original = fileOf(6_500_000);
    const prepared = await preparePhotoForUpload(original, codec([2_800_000, 1_900_000, 1_100_000]));
    expect(prepared.size).toBeLessThanOrEqual(UPLOAD_TARGET_BYTES);
    expect(prepared.size).toBeLessThan(original.size);
    expect(prepared.type).toBe("image/jpeg");
    expect(prepared.name).toBe("phone.jpg");
    expect(prepared.size).toBeLessThan(PHOTO_MAX_BYTES);
  });

  it("keeps stepping quality and edge down until the jpeg fits", async () => {
    const decoded: DecodedPhoto = { width: 4032, height: 3024 };
    const blob = await encodeJpegUntil(
      decoded,
      async (_decoded, width) => blobOf(width >= 1920 ? 2_000_000 : 900_000),
    );
    expect(blob.size).toBeLessThanOrEqual(UPLOAD_TARGET_BYTES);
  });

  it("leaves a small jpeg that already fits alone", async () => {
    const original = fileOf(220_000, "kettle.jpg");
    const prepared = await preparePhotoForUpload(original, {
      async decode() {
        return { width: 1200, height: 800 };
      },
      async encode() {
        throw new Error("should not re-encode a small jpeg");
      },
    });
    expect(prepared).toBe(original);
  });
});
