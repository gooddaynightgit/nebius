import { encode as encodeJpeg } from "jpeg-js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { localDay } from "./day";
import { PHOTO_NOT_A_PICTURE, blankFromSamples, isStillImageFile, isVideoFile } from "./photo-picture";
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
import { chargeNewMoment } from "@/lib/entitlement";
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
    ).resolves.toBe(PHOTO_NOT_A_PICTURE);
    await expect(
      uploadedPictureRejection({
        bytes: Buffer.from(await solidJpeg(255, 255, 255, "white.jpg").arrayBuffer()),
        mime: "image/jpeg",
        filename: "white.jpg",
      }),
    ).resolves.toBe(PHOTO_NOT_A_PICTURE);
    await expect(
      uploadedPictureRejection({
        bytes: Buffer.from(await solidJpeg(30, 170, 50, "flat.jpg").arrayBuffer()),
        mime: "image/jpeg",
        filename: "flat.jpg",
      }),
    ).resolves.toBe(PHOTO_NOT_A_PICTURE);
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
    expect(await res.json()).toEqual({ error: PHOTO_NOT_A_PICTURE });
    expect(chargeNewMoment).not.toHaveBeenCalled();
  });

  it("rejects a flat colour without charging", async () => {
    const res = await postApp(solidJpeg(30, 170, 50, "flat.jpg"));
    expect(res.status).toBe(400);
    expect(chargeNewMoment).not.toHaveBeenCalled();
  });

  it("accepts a normal photo and only then charges", async () => {
    const res = await postApp(variedJpeg());
    expect(res.status).toBe(200);
    expect(chargeNewMoment).toHaveBeenCalledTimes(1);
    expect(chargeNewMoment).toHaveBeenCalledWith("amy@example.com", "mom_testpicture000001", false);
  });
});
