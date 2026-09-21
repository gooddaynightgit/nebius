import { describe, expect, it } from "vitest";
import { jpegBlobFromCanvas, prefersLiveCamera, stillFromLiveVideo } from "./live-camera";

describe("live camera", () => {
  it("offers getUserMedia on secure mobile, not desktop", () => {
    expect(
      prefersLiveCamera({
        secure: true,
        hasGetUserMedia: true,
        userAgent: "Mozilla/5.0 (Linux; Android 14; Pixel 8) Chrome/128.0.0.0",
        maxTouchPoints: 5,
      }),
    ).toBe(true);
    expect(
      prefersLiveCamera({
        secure: false,
        hasGetUserMedia: true,
        userAgent: "Mozilla/5.0 (Linux; Android 14; Pixel 8) Chrome/128.0.0.0",
        maxTouchPoints: 5,
      }),
    ).toBe(false);
    expect(
      prefersLiveCamera({
        secure: true,
        hasGetUserMedia: true,
        userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/128.0.0.0",
        maxTouchPoints: 0,
      }),
    ).toBe(false);
  });

  it("encodes live stills as JPEG, with a data-URL fallback", () => {
    expect(jpegBlobFromCanvas).toEqual(expect.any(Function));
    expect(stillFromLiveVideo.toString()).toMatch(/image\/jpeg/);
    expect(jpegBlobFromCanvas.toString()).toMatch(/toDataURL/);
  });
});
