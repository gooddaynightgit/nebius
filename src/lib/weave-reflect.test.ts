import { beforeEach, describe, expect, it, vi } from "vitest";

const completeWithFallback = vi.hoisted(() => vi.fn());

vi.mock("./nebius", async () => {
  const actual = await vi.importActual<typeof import("./nebius")>("./nebius");
  return {
    ...actual,
    completeWithFallback,
  };
});

import { MODELS } from "./config";
import { appStoryProblems } from "./app-story";
import {
  appReflectUserContent,
  appReflectUserText,
  formatCloserHint,
  weaveAppStoryFromExcavation,
} from "./weave";

const GOOD =
  "You spent today looking for the good instead of scrolling past it — cold chocolate, quiet sheets, a moment that could only belong to you. Kept, it opens the door to more.";

const IMAGE = "data:image/jpeg;base64,abc";

const input = {
  joyTitle: "Just this",
  template:
    "Ten quiet minutes. Gold on your skin and a longer canned playback that should not appear in the story at all.",
  excavation: "SUBJECTS & VIBE — No people. A frozen banana with chocolate.",
  caption: "eaten standing up",
  imageDataUrl: IMAGE,
};

describe("Nightly Reflection message shape", () => {
  it("attaches the photo for image2text Kimi", () => {
    const content = appReflectUserContent({ ...input, imageDataUrl: IMAGE });
    expect(Array.isArray(content)).toBe(true);
    expect(content).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: "text" }),
        expect.objectContaining({
          type: "image_url",
          image_url: { url: IMAGE },
        }),
      ]),
    );
    expect(appReflectUserText({ ...input, hasImage: true })).toMatch(/photo is attached/i);
  });

  it("stays text-only when no image is present", () => {
    const content = appReflectUserContent({ ...input, imageDataUrl: undefined });
    expect(typeof content).toBe("string");
    expect(content).toMatch(/photo pixels are not attached/i);
    expect(String(content)).not.toMatch(/photo is attached/i);
  });

  it("lets a valid ~35-word reflection through the closer validators", () => {
    expect(appStoryProblems(GOOD, input.template)).toEqual([]);
  });
});

const INSULT =
  "You spent today noticing instead of rushing past—wrinkled skin cradling dark chocolate, a moment held like something precious. This quiet pause could only be yours.";

describe("Nightly Reflection live fallback", () => {
  beforeEach(() => {
    completeWithFallback.mockReset();
  });

  it("sends multimodal content to Kimi when the photo is present", async () => {
    completeWithFallback.mockResolvedValueOnce({
      text: GOOD,
      model: "moonshotai/Kimi-K2.6",
    });
    const live = await weaveAppStoryFromExcavation(input);
    expect(live).toMatchObject({ body: GOOD, model: "moonshotai/Kimi-K2.6" });
    expect(completeWithFallback).toHaveBeenCalledTimes(1);
    const [models, messages] = completeWithFallback.mock.calls[0] as [
      string[],
      Array<{ content: unknown }>,
    ];
    expect(models).toEqual(["moonshotai/Kimi-K2.6"]);
    expect(messages[1].content).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: "image_url", image_url: { url: IMAGE } }),
      ]),
    );
  });

  it("tries Qwen text-only after multimodal Kimi fails, before mock", async () => {
    completeWithFallback
      .mockRejectedValueOnce(
        new Error("Token Factory moonshotai/Kimi-K2.6 failed (400): image required"),
      )
      .mockResolvedValueOnce({
        text: GOOD,
        model: MODELS.storyText,
      });
    const live = await weaveAppStoryFromExcavation(input);
    expect(live).toMatchObject({ body: GOOD, model: MODELS.storyText });
    expect(completeWithFallback).toHaveBeenCalledTimes(2);
    const visionModels = completeWithFallback.mock.calls[0][0] as string[];
    const textCall = completeWithFallback.mock.calls[1] as [
      string[],
      Array<{ content: unknown }>,
    ];
    expect(visionModels).toEqual(["moonshotai/Kimi-K2.6"]);
    expect(textCall[0][0]).toBe(MODELS.storyText);
    expect(textCall[0]).toContain(MODELS.super);
    expect(typeof textCall[1][1].content).toBe("string");
  });

  it("returns fail only after vision and text both fail", async () => {
    completeWithFallback.mockRejectedValue(new Error("boom"));
    const live = await weaveAppStoryFromExcavation(input);
    expect(live).toMatchObject({
      fail: expect.objectContaining({ lastError: expect.stringMatching(/boom/) }),
    });
    expect(completeWithFallback).toHaveBeenCalledTimes(2);
    expect(live && "body" in live).toBe(false);
  });

  it("does not burn Kimi rewrite retries on a 400; Qwen text still runs", async () => {
    completeWithFallback
      .mockRejectedValueOnce(
        new Error("Token Factory moonshotai/Kimi-K2.6 failed (400): payload too large"),
      )
      .mockResolvedValueOnce({
        text: GOOD,
        model: MODELS.storyText,
      });
    const live = await weaveAppStoryFromExcavation(input);
    expect(live).toMatchObject({ body: GOOD, model: MODELS.storyText });
    expect(completeWithFallback).toHaveBeenCalledTimes(2);
    expect(completeWithFallback.mock.calls[0][0]).toEqual(["moonshotai/Kimi-K2.6"]);
    expect(completeWithFallback.mock.calls[1][0][0]).toBe(MODELS.storyText);
  });

  it("retries a 503 on the same vision set before falling through", async () => {
    completeWithFallback
      .mockRejectedValueOnce(
        new Error("Token Factory moonshotai/Kimi-K2.6 failed (503): busy"),
      )
      .mockResolvedValueOnce({
        text: GOOD,
        model: "moonshotai/Kimi-K2.6",
      });
    const live = await weaveAppStoryFromExcavation(input);
    expect(live).toMatchObject({ body: GOOD, model: "moonshotai/Kimi-K2.6" });
    expect(completeWithFallback).toHaveBeenCalledTimes(2);
    expect(completeWithFallback.mock.calls[0][0]).toEqual(["moonshotai/Kimi-K2.6"]);
    expect(completeWithFallback.mock.calls[1][0]).toEqual(["moonshotai/Kimi-K2.6"]);
  });

  it("keeps a short non-secret closerHint for mock debug", () => {
    const hint = formatCloserHint({
      lastBody: "",
      lastModel: "moonshotai/Kimi-K2.6",
      lastProblems: [],
      lastError: "Token Factory moonshotai/Kimi-K2.6 failed (400): Bearer sk-secret payload",
    });
    expect(hint).toMatch(/model=moonshotai\/Kimi-K2\.6/);
    expect(hint).toMatch(/Bearer \[redacted\]/);
    expect(hint).not.toMatch(/sk-secret/);
    expect(hint.length).toBeLessThanOrEqual(180);
  });

  it("retries when the draft quotes wrinkled skin, then accepts a kind rewrite", async () => {
    completeWithFallback
      .mockResolvedValueOnce({
        text: INSULT,
        model: "moonshotai/Kimi-K2.6",
      })
      .mockResolvedValueOnce({
        text: GOOD,
        model: "moonshotai/Kimi-K2.6",
      });
    const live = await weaveAppStoryFromExcavation(input);
    expect(live).toMatchObject({ body: GOOD, model: "moonshotai/Kimi-K2.6" });
    expect(completeWithFallback).toHaveBeenCalledTimes(2);
    const retryMessages = completeWithFallback.mock.calls[1][1] as Array<{ content: unknown }>;
    const hint = String(retryMessages[retryMessages.length - 1]?.content ?? "");
    expect(hint).toMatch(/unflattering body/i);
    expect(hint).toMatch(/wrinkled skin/i);
    expect(hint).toMatch(/foil, peel, cocoa/i);
  });

  it("does not keep a last draft that quotes wrinkled skin", async () => {
    completeWithFallback.mockResolvedValue({
      text: INSULT,
      model: "moonshotai/Kimi-K2.6",
    });
    const live = await weaveAppStoryFromExcavation(input);
    expect(live && "body" in live).toBe(false);
    expect(live).toMatchObject({
      fail: expect.objectContaining({
        lastProblems: expect.arrayContaining(["harsh"]),
      }),
    });
  });

  it("does not attach an image on the text-only path", async () => {
    completeWithFallback.mockResolvedValueOnce({
      text: GOOD,
      model: MODELS.storyText,
    });
    const live = await weaveAppStoryFromExcavation({ ...input, imageDataUrl: undefined });
    expect(live).toMatchObject({ model: MODELS.storyText });
    expect(completeWithFallback).toHaveBeenCalledTimes(1);
    const [models, messages] = completeWithFallback.mock.calls[0] as [
      string[],
      Array<{ content: unknown }>,
    ];
    expect(models[0]).toBe(MODELS.storyText);
    expect(typeof messages[1].content).toBe("string");
  });
});
