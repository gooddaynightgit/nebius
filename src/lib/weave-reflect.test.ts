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
  "Today, you kept the cold chocolate and the quiet sheets, eaten standing up before it melted. Lovely on the tongue, bright against the linen, wonderful that you stayed. Fantastic, you found one good moment today — the finding is what's changing you.";

const IMAGE = "data:image/jpeg;base64,abc";

const input = {
  joyTitle: "Just this",
  template:
    "Ten quiet minutes. Gold on your skin and a longer canned playback that should not appear in the story at all.",
  excavation: "Whoa you, a frozen banana with chocolate. Did I see that right?",
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
    expect(appReflectUserText({ ...input, hasImage: true })).toMatch(/Joy picked: Just this/);
    expect(appReflectUserText({ ...input, hasImage: true })).toMatch(/Photo: attached/);
    expect(appReflectUserText({ ...input, hasImage: true })).toMatch(/Their answer: eaten standing up/);
    expect(appReflectUserText({ ...input, hasImage: true })).toMatch(/frozen banana/);
  });

  it("stays text-only when no image is present", () => {
    const content = appReflectUserContent({ ...input, imageDataUrl: undefined });
    expect(typeof content).toBe("string");
    expect(content).toMatch(/Photo: description/);
    expect(String(content)).not.toMatch(/Photo: attached/);
  });

  it("lets a valid under-60-word confirmation through the closer validators", () => {
    expect(appStoryProblems(GOOD, input.template)).toEqual([]);
  });
});

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

  it("still sends the photo and the confirmed spark after Yes", async () => {
    const body =
      "Today, you kept a pug in a plaid blanket on the forest path, and you called it your test story. Lovely, bright, and wonderful in the quiet. Phenomenal you hunted one good moment today, and the hunting became your happiness, your joy.";
    completeWithFallback.mockResolvedValueOnce({
      text: body,
      model: "moonshotai/Kimi-K2.6",
    });
    const live = await weaveAppStoryFromExcavation({
      ...input,
      joyTitle: "Morning sunlight",
      excavation:
        "A pug sits wrapped in a plaid blanket, surrounded by greenery and fallen leaves on a forest path.",
      caption: "Test story: pug in a blanket",
      photoEmphasis: "low",
      sparkAnswer: "yes",
      imageDataUrl: IMAGE,
    });
    expect(live).toMatchObject({ body, model: "moonshotai/Kimi-K2.6" });
    const messages = completeWithFallback.mock.calls[0][1] as Array<{ content: unknown }>;
    const content = messages[1].content as Array<{ type: string; text?: string }>;
    expect(content).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: "image_url", image_url: { url: IMAGE } }),
      ]),
    );
    const text = content.find((part) => part.type === "text")?.text || "";
    expect(text).toMatch(/pug/);
    expect(text).toMatch(/plaid blanket/);
    expect(text).toMatch(/forest path/);
    expect(text).toMatch(/Test story: pug in a blanket/);
    expect(text).not.toMatch(/Photo: withheld/);
  });

  it("rejects a joy-only draft when the spark names the picture", async () => {
    const joyOnly =
      "Today, you welcomed the morning sunlight as a quiet companion, feeling its warmth like a gentle promise. The stillness turned soft, radiant, and lovely. Phenomenal you found one good moment today — the finding is what's changing you.";
    completeWithFallback.mockResolvedValue({
      text: joyOnly,
      model: "moonshotai/Kimi-K2.6",
    });
    const live = await weaveAppStoryFromExcavation({
      ...input,
      joyTitle: "Morning sunlight",
      excavation:
        "A pug sits wrapped in a plaid blanket, surrounded by greenery and fallen leaves on a forest path.",
      caption: "Test story: pug in a blanket",
      photoEmphasis: "low",
      sparkAnswer: "yes",
      imageDataUrl: undefined,
    });
    expect(live && "body" in live).toBe(false);
    expect(live).toMatchObject({
      fail: expect.objectContaining({ lastProblems: expect.arrayContaining(["picture"]) }),
    });
    const hint = String(
      (completeWithFallback.mock.calls.at(-1)?.[1] as Array<{ content: string }>).at(-1)?.content,
    );
    expect(hint).toMatch(/left the picture out/i);
  });
});
