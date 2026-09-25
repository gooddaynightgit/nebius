import { readFileSync } from "node:fs";
import path from "node:path";
import { encode as encodeJpeg } from "jpeg-js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { localDay } from "./day";
import {
  PHOTO_NOT_A_PICTURE,
  PHOTO_NOT_CLEAR,
  blankFromSamples,
  isStillImageFile,
  isVideoFile,
  readPhotoClear,
  stripPhotoClear,
} from "./photo-picture";
import { uploadedPictureRejection } from "./photo-picture-server";

vi.mock("@/lib/session", () => ({
  loadSessionVault: vi.fn(),
  presentSession: vi.fn(),
  requirePersonalPhotoOtp: vi.fn(async () => null),
  toPublicSession: vi.fn(),
}));

vi.mock("@/lib/entitlement", () => ({
  chargeNewMoment: vi.fn(),
  restoreNewMoment: vi.fn(),
}));

vi.mock("@/lib/storage", () => ({
  putBytes: vi.fn(async () => undefined),
}));

vi.mock("@/lib/ingest", () => ({
  ingestAppPhoto: vi.fn(async () => ({
    goodMoment: "the light on the kettle",
    reframed: false,
    model: "mock",
    status: "mock",
  })),
  ingestGood: vi.fn(),
}));

vi.mock("@/lib/weave", () => ({
  sparkForPhoto: vi.fn(async () => ({ spark: "a cup on the table" })),
}));

vi.mock("@/lib/safety", async () => {
  const { SAFETY_REFUSAL } = await import("./safety-text");
  return {
    inspectImageSafety: vi.fn(async () => ({ safe: true })),
    SAFETY_REFUSAL,
  };
});

vi.mock("@/lib/vault", () => ({
  addCapture: vi.fn(),
  appPhotoById: vi.fn(() => null),
  capturesForDay: vi.fn(() => []),
  saveAppMoment: vi.fn(async (_vault: unknown, capture: unknown) => capture),
}));

import { POST } from "@/app/api/captures/route";
import { POST as postSpark } from "@/app/api/photo-spark/route";
import { chargeNewMoment } from "@/lib/entitlement";
import { ingestAppPhoto } from "@/lib/ingest";
import { sparkForPhoto } from "@/lib/weave";
import { loadSessionVault, presentSession } from "@/lib/session";

function solidJpeg(r: number, g: number, b: number, name: string): File {
  const width = 48;
  const height = 48;
  const data = Buffer.alloc(width * height * 4);
  for (let i = 0; i < data.length; i += 4) {
    data[i] = r;
    data[i + 1] = g;
    data[i + 2] = b;
    data[i + 3] = 255;
  }
  const encoded = Buffer.from(encodeJpeg({ data, width, height }, 90).data);
  return new File([encoded], name, { type: "image/jpeg" });
}

function paintJpeg(
  name: string,
  width: number,
  height: number,
  pixel: (x: number, y: number) => [number, number, number],
): File {
  const data = Buffer.alloc(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const i = (y * width + x) * 4;
      const [r, g, b] = pixel(x, y);
      data[i] = r;
      data[i + 1] = g;
      data[i + 2] = b;
      data[i + 3] = 255;
    }
  }
  const encoded = Buffer.from(encodeJpeg({ data, width, height }, 85).data);
  return new File([encoded], name, { type: "image/jpeg" });
}

function clampByte(value: number): number {
  return Math.max(0, Math.min(255, Math.round(value)));
}

/**
 * Light grey wall the old flat-colour check lets through: uneven light and
 * slight low-frequency texture, no edge of an object.
 */
function greyWallJpeg(): File {
  return paintJpeg("grey-wall.jpg", 360, 270, (x, y) => {
    const shade =
      172 +
      (x / 360) * 30 +
      (y / 270) * 16 +
      Math.sin(x / 42) * 7 +
      Math.sin(y / 37) * 5;
    return [clampByte(shade), clampByte(shade - 1), clampByte(shade - 2)];
  });
}

/** Open sky with a gentle vertical grade and no subject. */
function skyOnlyJpeg(): File {
  return paintJpeg("sky-only.jpg", 360, 270, (x, y) => {
    const t = y / 270;
    const wobble = Math.sin(x / 48) * 2;
    return [clampByte(156 - t * 28 + wobble), clampByte(196 - t * 36), clampByte(226 - t * 18)];
  });
}

/** Soft skin-toned blob, as when a finger covers the lens. */
function fingerJpeg(): File {
  return paintJpeg("finger.jpg", 360, 270, (x, y) => {
    const dx = (x - 180) / 210;
    const dy = (y - 140) / 170;
    const fade = Math.max(0, 1 - Math.sqrt(dx * dx + dy * dy));
    const skin = 48 + fade * 150;
    return [clampByte(skin + 28), clampByte(skin * 0.72), clampByte(skin * 0.58)];
  });
}

/** Pocket darkness: very low brightness, a little uneven, no subject. */
function almostBlackJpeg(): File {
  return paintJpeg("almost-black.jpg", 320, 240, (x, y) => {
    const shade = 6 + (x / 320) * 32 + (y / 240) * 10 + Math.sin(x / 28) * 4;
    return [clampByte(shade), clampByte(shade), clampByte(shade + 1)];
  });
}

/** Dim room that still shows a window and a mug. */
function dimSceneJpeg(): File {
  return paintJpeg("dim-room.jpg", 360, 270, (x, y) => {
    let r = 24;
    let g = 26;
    let b = 32;
    if (x > 230 && x < 330 && y > 28 && y < 150) {
      r = 168;
      g = 176;
      b = 132;
    }
    const dx = (x - 130) / 36;
    const dy = (y - 188) / 46;
    if (dx * dx + dy * dy < 1) {
      r = 96;
      g = 72;
      b = 48;
    }
    return [r, g, b];
  });
}

/** One cup, a saucer, and a spoon on a table. */
function cupOnTableJpeg(): File {
  return paintJpeg("cup-on-table.jpg", 360, 270, (x, y) => {
    const grain = (x % 6 === 0 ? 8 : 0) + (y % 9 === 0 ? 6 : 0);
    let r = 168 + grain;
    let g = 132 + grain;
    let b = 96;
    const dx = (x - 168) / 54;
    const dy = (y - 132) / 62;
    if (dx * dx + dy * dy < 1) {
      r = 236;
      g = 236;
      b = 228;
    }
    if (dx * dx + dy * dy < 0.55) {
      r = 92;
      g = 58;
      b = 36;
    }
    const hx = (x - 228) / 16;
    const hy = (y - 132) / 28;
    if (hx * hx + hy * hy < 1 && hx * hx + hy * hy > 0.35) {
      r = 210;
      g = 210;
      b = 204;
    }
    if (y > 176 && y < 188 && x > 120 && x < 250) {
      r = 214;
      g = 206;
      b = 190;
    }
    if (y > 186 && y < 192 && x > 250 && x < 310) {
      r = 70;
      g = 70;
      b = 74;
    }
    return [r, g, b];
  });
}

/** A few dark strokes on paper. */
function handwrittenNoteJpeg(): File {
  return paintJpeg("handwritten-note.jpg", 360, 270, (x, y) => {
    let ink = false;
    for (let line = 0; line < 5; line += 1) {
      const base = 48 + line * 42;
      const wave = Math.sin(x / 18 + line) * 6;
      if (Math.abs(y - (base + wave)) < 2 && x > 36 && x < 300) ink = true;
    }
    if (ink) return [28, 32, 48];
    return [244, 240, 230];
  });
}

/** A phone screen of text: header bar plus glyph-like rows. */
function textScreenshotJpeg(): File {
  return paintJpeg("text-screenshot.jpg", 360, 270, (x, y) => {
    if (y < 36) return [22, 58, 92];
    const row = Math.floor((y - 52) / 28);
    const inRow = row >= 0 && row < 6 && y - 52 - row * 28 < 8;
    const band = inRow && x > 28 && x < 28 + 80 + ((row * 47) % 180);
    if (band) return [24, 28, 36];
    return [248, 248, 246];
  });
}

function variedJpeg(): File {
  const width = 48;
  const height = 48;
  const data = Buffer.alloc(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const i = (y * width + x) * 4;
      data[i] = (x * 5) % 256;
      data[i + 1] = (y * 4 + 30) % 256;
      data[i + 2] = (x * y + 80) % 256;
      data[i + 3] = 255;
    }
  }
  const encoded = Buffer.from(encodeJpeg({ data, width, height }, 90).data);
  return new File([encoded], "kettle.jpg", { type: "image/jpeg" });
}

function postApp(file: File) {
  const form = new FormData();
  form.set("source", "app");
  form.set("kind", "photo");
  form.set("day", localDay());
  form.set("joyType", "just-this");
  form.set("caption", "the kettle");
  form.set("tzOffset", "0");
  form.set("momentId", "mom_testpicture000001");
  form.set("sparkAnswer", "yes");
  form.set("file", file, file.name);
  return POST(new Request("http://localhost/api/captures", { method: "POST", body: form }));
}

describe("still picture gate", () => {
  it("rejects a video MIME and a video extension", () => {
    expect(isVideoFile({ type: "video/mp4", name: "clip.mp4" })).toBe(true);
    expect(isStillImageFile({ type: "video/mp4", name: "clip.mp4" })).toBe(false);
    expect(isStillImageFile({ type: "video/quicktime", name: "clip.mov" })).toBe(false);
    expect(isStillImageFile({ type: "", name: "clip.mov" })).toBe(false);
    expect(isStillImageFile({ type: "image/jpeg", name: "clip.mp4" })).toBe(false);
    expect(isStillImageFile({ type: "application/pdf", name: "notes.pdf" })).toBe(false);
    expect(isStillImageFile({ type: "image/jpeg", name: "kettle.jpg" })).toBe(true);
    expect(isStillImageFile({ type: "image/png", name: "sky.png" })).toBe(true);
    expect(isStillImageFile({ type: "image/webp", name: "leaf.webp" })).toBe(true);
    expect(isStillImageFile({ type: "image/heic", name: "IMG.HEIC" })).toBe(true);
    expect(isStillImageFile({ type: "application/octet-stream", name: "moment.jpg" })).toBe(true);
  });

  it("rejects black, white, and a single flat colour, and accepts a varied photo", () => {
    expect(blankFromSamples([0, 0, 0, 255, 0, 0, 0, 255], 4).blank).toBe(true);
    expect(blankFromSamples([255, 255, 255, 255, 255, 255, 255, 255], 4).blank).toBe(true);
    expect(blankFromSamples([20, 180, 40, 255, 20, 180, 40, 255], 4).blank).toBe(true);
    const varied = blankFromSamples([10, 20, 30, 255, 200, 40, 10, 255, 30, 180, 220, 255], 4);
    expect(varied.blank).toBe(false);
  });

  it("rejects black, white, and flat JPEGs and accepts a normal photo", async () => {
    await expect(
      uploadedPictureRejection({
        bytes: Buffer.from(await solidJpeg(0, 0, 0, "black.jpg").arrayBuffer()),
        mime: "image/jpeg",
        filename: "black.jpg",
      }),
    ).resolves.toBe(PHOTO_NOT_CLEAR);
    await expect(
      uploadedPictureRejection({
        bytes: Buffer.from(await solidJpeg(255, 255, 255, "white.jpg").arrayBuffer()),
        mime: "image/jpeg",
        filename: "white.jpg",
      }),
    ).resolves.toBe(PHOTO_NOT_CLEAR);
    await expect(
      uploadedPictureRejection({
        bytes: Buffer.from(await solidJpeg(30, 170, 50, "flat.jpg").arrayBuffer()),
        mime: "image/jpeg",
        filename: "flat.jpg",
      }),
    ).resolves.toBe(PHOTO_NOT_CLEAR);
    await expect(
      uploadedPictureRejection({
        bytes: Buffer.from(await variedJpeg().arrayBuffer()),
        mime: "image/jpeg",
        filename: "kettle.jpg",
      }),
    ).resolves.toBeNull();
    await expect(
      uploadedPictureRejection({
        bytes: Buffer.from("not-a-picture"),
        mime: "video/mp4",
        filename: "clip.mp4",
      }),
    ).resolves.toBe(PHOTO_NOT_A_PICTURE);
  });

  it("rejects a textured grey wall, sky, a covered lens, and a dark pocket, and keeps ordinary photos", async () => {
    const rejected = [greyWallJpeg(), skyOnlyJpeg(), fingerJpeg(), almostBlackJpeg()];
    for (const file of rejected) {
      await expect(
        uploadedPictureRejection({
          bytes: Buffer.from(await file.arrayBuffer()),
          mime: "image/jpeg",
          filename: file.name,
        }),
        file.name,
      ).resolves.toBe(PHOTO_NOT_CLEAR);
    }
    const accepted = [dimSceneJpeg(), cupOnTableJpeg(), handwrittenNoteJpeg(), textScreenshotJpeg(), variedJpeg()];
    for (const file of accepted) {
      await expect(
        uploadedPictureRejection({
          bytes: Buffer.from(await file.arrayBuffer()),
          mime: "image/jpeg",
          filename: file.name,
        }),
        file.name,
      ).resolves.toBeNull();
    }
  });

  it("reads a yes or no from the same vision description", () => {
    expect(readPhotoClear("CLEAR: no\nA plain, light gray wall with a subtle texture.")).toBe(false);
    expect(readPhotoClear("CLEAR: yes\nA white cup on a wooden table.")).toBe(true);
    expect(readPhotoClear("A white cup on a wooden table.")).toBeNull();
    expect(stripPhotoClear("CLEAR: yes\nA white cup on a wooden table.")).toBe(
      "A white cup on a wooden table.",
    );
  });
});

describe("capture upload does not spend a credit on a bad picture", () => {
  beforeEach(() => {
    vi.mocked(chargeNewMoment).mockReset();
    vi.mocked(chargeNewMoment).mockResolvedValue({ ok: true, remaining: 39, charged: true });
    vi.mocked(loadSessionVault).mockResolvedValue({
      sessionId: "sid",
      day: localDay(),
      vault: { id: "v1", email: "amy@example.com", captures: [] } as never,
    });
    vi.mocked(presentSession).mockResolvedValue({
      sessionId: "sid",
      email: "amy@example.com",
      otpVerified: true,
    } as never);
  });

  it("rejects a video without charging", async () => {
    const res = await postApp(new File([Buffer.from("video")], "clip.mp4", { type: "video/mp4" }));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: PHOTO_NOT_A_PICTURE });
    expect(chargeNewMoment).not.toHaveBeenCalled();
  });

  it("rejects a black image without charging", async () => {
    const res = await postApp(solidJpeg(0, 0, 0, "black.jpg"));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: PHOTO_NOT_CLEAR });
    expect(chargeNewMoment).not.toHaveBeenCalled();
  });

  it("rejects a flat colour without charging", async () => {
    const res = await postApp(solidJpeg(30, 170, 50, "flat.jpg"));
    expect(res.status).toBe(400);
    expect(chargeNewMoment).not.toHaveBeenCalled();
  });

  it("rejects a grey wall without charging", async () => {
    const res = await postApp(greyWallJpeg());
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: PHOTO_NOT_CLEAR });
    expect(chargeNewMoment).not.toHaveBeenCalled();
  });

  it("rejects an unclear vision read before charging", async () => {
    vi.mocked(ingestAppPhoto).mockResolvedValueOnce({
      goodMoment: "A plain, light gray wall with a subtle texture.",
      reframed: false,
      model: "mock",
      status: "ok",
      clear: false,
    });
    const res = await postApp(cupOnTableJpeg());
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: PHOTO_NOT_CLEAR });
    expect(chargeNewMoment).not.toHaveBeenCalled();
  });

  it("asks the weave description for a clear yes or no before the charge", () => {
    const route = readFileSync(path.resolve("src/app/api/captures/route.ts"), "utf8");
    const clearAt = route.indexOf("ingest.clear === false");
    const chargeAt = route.indexOf("await chargeNewMoment");
    expect(clearAt).toBeGreaterThan(0);
    expect(chargeAt).toBeGreaterThan(clearAt);
    const spark = readFileSync(path.resolve("src/app/api/photo-spark/route.ts"), "utf8");
    const pictureAt = spark.indexOf("uploadedPictureRejection");
    const visionAt = spark.indexOf("sparkForPhoto");
    expect(pictureAt).toBeGreaterThan(0);
    expect(visionAt).toBeGreaterThan(pictureAt);
    expect(spark).toMatch(/PHOTO_NOT_CLEAR/);
  });

  it("accepts a normal photo and only then charges", async () => {
    const res = await postApp(variedJpeg());
    expect(res.status).toBe(200);
    expect(chargeNewMoment).toHaveBeenCalledTimes(1);
    expect(chargeNewMoment).toHaveBeenCalledWith("amy@example.com", "mom_testpicture000001", false);
  });

  it("stops the photo spark when the vision read says the picture is not clear", async () => {
    vi.mocked(sparkForPhoto).mockResolvedValueOnce({ unclear: true });
    const file = cupOnTableJpeg();
    const form = new FormData();
    form.set("file", file, file.name);
    const res = await postSpark(new Request("http://localhost/api/photo-spark", { method: "POST", body: form }));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: PHOTO_NOT_CLEAR });
  });
});
