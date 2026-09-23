import { describe, expect, it } from "vitest";
import { capturePreviewSrc, isCaptureQuestionOpen } from "./photo-preview";

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

describe("capture question gate", () => {
  it("hides the what-box during the neon wait and until Yes or No", () => {
    expect(
      isCaptureQuestionOpen({
        sparkPending: true,
        hasSpark: false,
        sparkGeneration: 2,
        answeredGeneration: null,
      }),
    ).toBe(false);
    expect(
      isCaptureQuestionOpen({
        sparkPending: false,
        hasSpark: true,
        sparkGeneration: 2,
        answeredGeneration: null,
      }),
    ).toBe(false);
  });

  it("after replace, a previous Yes does not keep the what-box open", () => {
    expect(
      isCaptureQuestionOpen({
        sparkPending: true,
        hasSpark: false,
        sparkGeneration: 2,
        answeredGeneration: 1,
      }),
    ).toBe(false);
    expect(
      isCaptureQuestionOpen({
        sparkPending: false,
        hasSpark: true,
        sparkGeneration: 2,
        answeredGeneration: 1,
      }),
    ).toBe(false);
  });

  it("shows an open what-box only after Yes or No on this spark", () => {
    expect(
      isCaptureQuestionOpen({
        sparkPending: false,
        hasSpark: true,
        sparkGeneration: 2,
        answeredGeneration: 2,
      }),
    ).toBe(true);
  });
});
