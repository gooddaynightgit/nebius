import { describe, expect, it } from "vitest";
import { capturePreviewSrc } from "./photo-preview";

describe("capture preview src", () => {
  it("shows the replacement object URL instead of the previous capture", () => {
    expect(
      capturePreviewSrc({
        localPreviewUrl: "blob:food-ad",
        hasLocalPhoto: true,
        savedMediaUrl: "/api/media/bmw",
      }),
    ).toBe("blob:food-ad");
  });

  it("does not fall back to the saved photo while a replacement file is in hand", () => {
    expect(
      capturePreviewSrc({
        localPreviewUrl: null,
        hasLocalPhoto: true,
        savedMediaUrl: "/api/media/bmw",
      }),
    ).toBeNull();
  });

  it("shows the saved capture when the user has not chosen a new file", () => {
    expect(
      capturePreviewSrc({
        localPreviewUrl: null,
        hasLocalPhoto: false,
        savedMediaUrl: "/api/media/bmw",
      }),
    ).toBe("/api/media/bmw");
  });
});
