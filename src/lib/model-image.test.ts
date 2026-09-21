import { encode as encodeJpeg } from "jpeg-js";
import { describe, expect, it } from "vitest";
import {
  MODEL_IMAGE_MAX_EDGE,
  MODEL_IMAGE_TARGET_BYTES,
  imageDataUrlForModels,
  jpegDataUrl,
  jpegDimensions,
  parseImageDataUrl,
  shrinkDataUrlForModels,
} from "./model-image";

function rgbaFill(width: number, height: number): Uint8Array {
  const data = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const i = (y * width + x) * 4;
      data[i] = (x * 37) % 255;
      data[i + 1] = (y * 19) % 255;
      data[i + 2] = 80;
      data[i + 3] = 255;
    }
  }
  return data;
}

function makeJpeg(width: number, height: number, quality = 90): Buffer {
  return Buffer.from(encodeJpeg({ data: rgbaFill(width, height), width, height }, quality).data);
}

describe("model image shrink", () => {
  it("parses a jpeg data URL and reads SOF dimensions", () => {
    const bytes = makeJpeg(64, 48);
    const url = jpegDataUrl(bytes);
    const parsed = parseImageDataUrl(url);
    expect(parsed?.mime).toBe("image/jpeg");
    expect(parsed?.bytes.length).toBe(bytes.length);
    expect(jpegDimensions(parsed!.bytes)).toEqual({ width: 64, height: 48 });
  });

  it("passes through a small jpeg already under the cap", () => {
    const url = jpegDataUrl(makeJpeg(80, 60));
    expect(shrinkDataUrlForModels(url)).toBe(url);
  });

  it("returns invalid or non-jpeg payloads unchanged", () => {
    expect(shrinkDataUrlForModels("not-a-data-url")).toBe("not-a-data-url");
    const png = "data:image/png;base64,iVBORw0KGgo=";
    expect(shrinkDataUrlForModels(png)).toBe(png);
  });

  it("downscales a long-edge jpeg before Token Factory calls", () => {
    const original = makeJpeg(1800, 1200, 92);
    expect(Math.max(jpegDimensions(original)!.width, jpegDimensions(original)!.height)).toBeGreaterThan(
      MODEL_IMAGE_MAX_EDGE,
    );
    const shrunk = shrinkDataUrlForModels(jpegDataUrl(original));
    const parsed = parseImageDataUrl(shrunk);
    expect(parsed?.mime).toBe("image/jpeg");
    const dims = jpegDimensions(parsed!.bytes);
    expect(dims).toBeTruthy();
    expect(Math.max(dims!.width, dims!.height)).toBeLessThanOrEqual(MODEL_IMAGE_MAX_EDGE);
    expect(parsed!.bytes.length).toBeLessThanOrEqual(MODEL_IMAGE_TARGET_BYTES);
    expect(parsed!.bytes.length).toBeLessThan(original.length);
  });

  it("builds a model data URL from raw bytes", () => {
    const bytes = makeJpeg(90, 70);
    const url = imageDataUrlForModels("image/jpeg", bytes);
    expect(url.startsWith("data:image/jpeg;base64,")).toBe(true);
    expect(parseImageDataUrl(url)?.bytes.length).toBe(bytes.length);
  });
});
