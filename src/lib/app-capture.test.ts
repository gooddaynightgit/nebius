import { describe, expect, it } from "vitest";
import { appPhotoRejection, captionDisposition, clipCaption, isEssayCaption, oneLineCaption } from "./app-capture";
import { localDay } from "./day";
import { PHOTO_DATE_MESSAGES } from "./photo";

const today = localDay();

describe("app photo save rules", () => {
  it("requires a today photo and a joy pick; caption is optional", () => {
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
    ).toBeNull();
  });

  it("rejects video, memes, someone else's moment, confirmed older dates, and horrific filenames — not captions", () => {
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
        filename: "unsplash-borrowed.jpg",
        size: 1200,
        takenDay: today,
      }),
    ).toMatch(/someone else's/i);
    expect(
      appPhotoRejection({
        day: today,
        joyId: "just-this",
        caption: "",
        mime: "image/png",
        filename: "IMG_screenshot.png",
        size: 1200,
        takenDay: today,
      }),
    ).toBeNull();
    expect(
      appPhotoRejection({
        day: today,
        joyId: "just-this",
        caption: "",
        mime: "image/jpeg",
        filename: "blurry-mess.jpg",
        size: 1200,
        takenDay: today,
      }),
    ).toBeNull();
    expect(
      appPhotoRejection({
        day: today,
        joyId: "just-this",
        caption: "",
        mime: "image/jpeg",
        filename: "old.jpg",
        size: 1200,
        takenDay: "1999-01-01",
        dateVerified: true,
      }),
    ).toBe(PHOTO_DATE_MESSAGES.old);
    expect(
      appPhotoRejection({
        day: today,
        joyId: "just-this",
        caption: "",
        mime: "image/jpeg",
        filename: "screenshot-watch-face.png",
        size: 1200,
        takenDay: "1999-01-01",
        dateVerified: false,
      }),
    ).toBeNull();
    expect(
      appPhotoRejection({
        day: today,
        joyId: "just-this",
        caption: "",
        mime: "image/jpeg",
        filename: "sad-hard-ordinary.jpg",
        size: 1200,
        takenDay: null,
      }),
    ).toBeNull();
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
    ).toBeNull();
    expect(
      appPhotoRejection({
        day: today,
        joyId: "just-this",
        caption: "",
        mime: "image/jpeg",
        filename: "gore-scene.jpg",
        size: 1200,
        takenDay: today,
      }),
    ).toMatch(/gentle moment/i);
  });

  it("keeps captions to one clipped line and drops blocked or essay lines", () => {
    expect(oneLineCaption("the light\non the kettle")).toBe("the light on the kettle");
    expect(clipCaption(`${"x".repeat(90)}`)).toHaveLength(80);
    expect(captionDisposition("he wrote back")).toEqual({ caption: "he wrote back", dropped: false });
    expect(captionDisposition("a gore scene from the movie")).toEqual({
      caption: "",
      dropped: true,
      reason: "blocked",
    });
    expect(isEssayCaption("grateful for tea, sun, and you")).toBe(true);
    expect(isEssayCaption("1) tea 2) sun 3) you")).toBe(true);
    expect(isEssayCaption("he wrote back")).toBe(false);
    expect(captionDisposition("grateful for tea, sun, and you").dropped).toBe(true);
  });
});
