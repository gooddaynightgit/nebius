import { describe, expect, it } from "vitest";
import {
  PHOTO_UNREADABLE,
  PHOTO_UNSUPPORTED,
  copyAsJpegFile,
  encodeJpegUntil,
  fitWithin,
  isHeicLike,
  isVaguePhotoType,
  jpegFileForCameraStill,
  jpegFileName,
  mimeForSniffedKind,
  normalizePhotoFile,
  preparePhotoForUpload,
  sniffPhotoBytes,
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

function fileFromBytes(bytes: Uint8Array, name: string, type: string): File {
  const copy = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  return new File([copy], name, { type, lastModified: Date.parse("2026-09-21T08:00:00.000Z") });
}

function jpegBytes(size = 64): Uint8Array {
  const bytes = new Uint8Array(Math.max(4, size));
  bytes[0] = 0xff;
  bytes[1] = 0xd8;
  bytes[2] = 0xff;
  bytes[bytes.length - 1] = 0xd9;
  return bytes;
}

function pngBytes(): Uint8Array {
  return new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
}

function webpBytes(): Uint8Array {
  const bytes = new Uint8Array(12);
  bytes.set([0x52, 0x49, 0x46, 0x46], 0);
  bytes.set([0x57, 0x45, 0x42, 0x50], 8);
  return bytes;
}

function heicBytes(): Uint8Array {
  const bytes = new Uint8Array(24);
  bytes[3] = 24;
  bytes.set([0x66, 0x74, 0x79, 0x70], 4);
  bytes.set([0x68, 0x65, 0x69, 0x63], 8);
  bytes.set([0x6d, 0x69, 0x66, 0x31], 16);
  return bytes;
}

function tiffBytes(): Uint8Array {
  return new Uint8Array([0x49, 0x49, 0x2a, 0x00, 0x08, 0x00, 0x00, 0x00]);
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

function passingCodec(): PhotoCodec {
  return {
    async decode(file) {
      if (!/image\/jpe?g/i.test(file.type)) throw new Error(`unexpected type ${file.type}`);
      return { width: 1200, height: 800 };
    },
    async encode() {
      throw new Error("should not re-encode a small jpeg");
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
    expect(prepared.type).toBe("image/jpeg");
    expect(prepared.name).toBe("kettle.jpg");
    expect(prepared.size).toBe(original.size);
  });
});

describe("photo sniff and android camera stills", () => {
  it("sniffs jpeg, png, webp, and heic magic bytes", () => {
    expect(sniffPhotoBytes(jpegBytes())).toBe("jpeg");
    expect(mimeForSniffedKind("jpeg")).toBe("image/jpeg");
    expect(sniffPhotoBytes(pngBytes())).toBe("png");
    expect(sniffPhotoBytes(webpBytes())).toBe("webp");
    expect(sniffPhotoBytes(heicBytes())).toBe("heic");
    expect(sniffPhotoBytes(tiffBytes())).toBe("tiff");
    expect(isVaguePhotoType("")).toBe(true);
    expect(isVaguePhotoType("application/octet-stream")).toBe(true);
    expect(isVaguePhotoType("image/jpeg")).toBe(false);
  });

  it("normalizes empty-type and octet-stream jpegs before decode", async () => {
    const empty = fileFromBytes(jpegBytes(1200), "image.jpg", "");
    const octet = fileFromBytes(jpegBytes(1200), "camera", "application/octet-stream");
    const normalizedEmpty = await normalizePhotoFile(empty);
    const normalizedOctet = await normalizePhotoFile(octet);
    expect(normalizedEmpty.type).toBe("image/jpeg");
    expect(normalizedEmpty.name).toBe("image.jpg");
    expect(normalizedOctet.type).toBe("image/jpeg");
    expect(normalizedOctet.name).toBe("camera.jpg");

    const preparedEmpty = await preparePhotoForUpload(empty, passingCodec());
    const preparedOctet = await preparePhotoForUpload(octet, passingCodec());
    expect(preparedEmpty.type).toBe("image/jpeg");
    expect(preparedOctet.type).toBe("image/jpeg");
    expect(preparedEmpty.size).toBe(1200);
  });

  it("asks HEIC, not the generic unread message, when sniff finds ftyp/heic", async () => {
    const unlabeled = fileFromBytes(heicBytes(), "image.jpg", "");
    const octet = fileFromBytes(heicBytes(), "IMG_1234", "application/octet-stream");
    expect(isHeicLike(await normalizePhotoFile(unlabeled))).toBe(true);
    await expect(preparePhotoForUpload(unlabeled, passingCodec())).rejects.toThrow(LANDING.app.heicAsk);
    await expect(preparePhotoForUpload(octet, passingCodec())).rejects.toThrow(LANDING.app.heicAsk);
    expect(LANDING.app.heicAsk).not.toBe(PHOTO_UNREADABLE);
  });

  it("passes through a jpeg that looks valid when decode fails under the size cap", async () => {
    const original = fileFromBytes(jpegBytes(80_000), "moment.jpg", "");
    const prepared = await preparePhotoForUpload(original, {
      async decode() {
        throw new Error("Could not read that photo. Try a JPEG or PNG.");
      },
      async encode() {
        throw new Error("should not encode after a failed decode");
      },
    });
    expect(prepared.type).toBe("image/jpeg");
    expect(prepared.name).toBe("moment.jpg");
    expect(prepared.size).toBe(80_000);
  });

  it("keeps HEIC / unsupported / corrupt errors distinct", async () => {
    await expect(
      preparePhotoForUpload(fileFromBytes(heicBytes(), "pic", ""), {
        async decode() {
          throw new Error("nope");
        },
        async encode() {
          return blobOf(10);
        },
      }),
    ).rejects.toThrow(LANDING.app.heicAsk);

    await expect(
      preparePhotoForUpload(fileFromBytes(tiffBytes(), "scan.tif", "application/octet-stream"), {
        async decode() {
          throw new Error("nope");
        },
        async encode() {
          return blobOf(10);
        },
      }),
    ).rejects.toThrow(PHOTO_UNSUPPORTED);

    await expect(
      preparePhotoForUpload(fileFromBytes(pngBytes(), "shot.png", "image/png"), {
        async decode() {
          throw new Error("nope");
        },
        async encode() {
          return blobOf(10);
        },
      }),
    ).rejects.toThrow(PHOTO_UNREADABLE);
  });

  it("types a live/take camera still as image/jpeg", async () => {
    const still = await jpegFileForCameraStill(fileFromBytes(jpegBytes(2400), "image", ""));
    expect(still.type).toBe("image/jpeg");
    expect(still.name).toBe("image.jpg");
    const copied = await copyAsJpegFile(
      new Blob([jpegBytes(32).buffer.slice(0, 32) as ArrayBuffer], { type: "" }),
      "still",
    );
    expect(copied.type).toBe("image/jpeg");
    expect(copied.name).toBe("still.jpg");
  });
});
