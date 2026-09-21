import { describe, expect, it } from "vitest";
import { appPhotoRejection, oneLineCaption } from "./app-capture";
import { localDay } from "./day";
import { PHOTO_DATE_MESSAGES } from "./photo";
import { SAFETY_REFUSAL } from "./safety-text";

const today = localDay();

describe("app photo save rules", () => {
  it("requires a today photo, a joy pick, and a short caption", () => {
    expect(
      appPhotoRejection({
        day: today,
        joyId: "morning-sunlight",
        caption: "",
        mime: "image/jpeg",
        filename: "sky.jpg",
        size: 1200,
        takenDay: today,
      }),
    ).toBeNull();
    expect(
      appPhotoRejection({
        day: today,
        joyId: "",
        caption: "",
        mime: "image/jpeg",
        filename: "sky.jpg",
        size: 1200,
        takenDay: today,
      }),
    ).toMatch(/quiet joy/i);
    expect(
      appPhotoRejection({
        day: today,
        joyId: "morning-sunlight",
        caption: "",
        mime: "image/jpeg",
        filename: "sky.jpg",
        size: 0,
        takenDay: today,
      }),
    ).toMatch(/photo from today/i);
    expect(
      appPhotoRejection({
        day: today,
        joyId: "morning-sunlight",
        caption: "x".repeat(81),
        mime: "image/jpeg",
        filename: "sky.jpg",
        size: 1200,
        takenDay: today,
      }),
    ).toMatch(/80/);
  });

  it("rejects video, memes, old dates, and horrific captions", () => {
    expect(
      appPhotoRejection({
        day: today,
        joyId: "just-this",
        caption: "",
        mime: "video/mp4",
        filename: "clip.mp4",
        size: 1200,
        takenDay: today,
      }),
    ).toMatch(/still frame/i);
    expect(
      appPhotoRejection({
        day: today,
        joyId: "just-this",
        caption: "",
        mime: "image/jpeg",
        filename: "giphy-meme.jpg",
        size: 1200,
        takenDay: today,
      }),
    ).toMatch(/meme/i);
    expect(
      appPhotoRejection({
        day: today,
        joyId: "just-this",
        caption: "",
        mime: "image/jpeg",
        filename: "old.jpg",
        size: 1200,
        takenDay: "1999-01-01",
      }),
    ).toBe(PHOTO_DATE_MESSAGES.old);
    expect(
      appPhotoRejection({
        day: today,
        joyId: "just-this",
        caption: "a gore scene from the movie",
        mime: "image/jpeg",
        filename: "still.jpg",
        size: 1200,
        takenDay: today,
      }),
    ).toBe(SAFETY_REFUSAL);
  });

  it("collapses captions to one line", () => {
    expect(oneLineCaption("the light\non the kettle")).toBe("the light on the kettle");
  });
});
