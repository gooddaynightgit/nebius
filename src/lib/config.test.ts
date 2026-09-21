import { afterEach, describe, expect, it } from "vitest";
import {
  MODELS,
  MODEL_DEFAULTS,
  envOr,
  tokenFactoryBase,
  TOKEN_FACTORY_DEFAULT,
} from "./config";
import { appStoryModels, appStoryTextModels, textExcavateModels } from "./nebius";

const MODEL_ENV = [
  "NEBIUS_NANO_MODEL",
  "NEBIUS_NANO_OMNI_MODEL",
  "NEBIUS_VISION_MODEL",
  "NEBIUS_STORY_MODEL",
  "NEBIUS_STORY_TEXT_MODEL",
  "NEBIUS_EXCAVATE_TEXT_MODEL",
  "NEBIUS_SUPER_MODEL",
  "NEBIUS_ULTRA_MODEL",
  "NEBIUS_ULTRA_FALLBACK_MODEL",
  "NEBIUS_SONIC_MODEL",
  "NEBIUS_TOKEN_FACTORY_BASE_URL",
] as const;

describe("envOr", () => {
  afterEach(() => {
    delete process.env.TEST_MODEL_ID;
  });

  it("uses the fallback when the var is missing, blank, or whitespace", () => {
    delete process.env.TEST_MODEL_ID;
    expect(envOr("TEST_MODEL_ID", "catalog")).toBe("catalog");
    process.env.TEST_MODEL_ID = "";
    expect(envOr("TEST_MODEL_ID", "catalog")).toBe("catalog");
    process.env.TEST_MODEL_ID = "   ";
    expect(envOr("TEST_MODEL_ID", "catalog")).toBe("catalog");
    process.env.TEST_MODEL_ID = "\n\t";
    expect(envOr("TEST_MODEL_ID", "catalog")).toBe("catalog");
  });

  it("trims a real override", () => {
    process.env.TEST_MODEL_ID = "  custom/id  ";
    expect(envOr("TEST_MODEL_ID", "catalog")).toBe("custom/id");
  });
});

describe("MODELS empty-env hygiene", () => {
  const previous: Record<string, string | undefined> = {};

  afterEach(() => {
    for (const name of MODEL_ENV) {
      if (previous[name] == null) delete process.env[name];
      else process.env[name] = previous[name];
    }
  });

  function blankAllModelEnv() {
    for (const name of MODEL_ENV) {
      previous[name] = process.env[name];
      process.env[name] = "";
    }
  }

  it("restores catalog defaults when Vercel left blank strings", () => {
    blankAllModelEnv();
    expect(MODELS.nano).toBe(MODEL_DEFAULTS.nano);
    expect(MODELS.nanoOmni).toBe(MODEL_DEFAULTS.nanoOmni);
    expect(MODELS.vision).toBe(MODEL_DEFAULTS.vision);
    expect(MODELS.story).toBe(MODEL_DEFAULTS.story);
    expect(MODELS.storyText).toBe(MODEL_DEFAULTS.storyText);
    expect(MODELS.excavateText).toBe(MODEL_DEFAULTS.excavateText);
    expect(MODELS.super).toBe(MODEL_DEFAULTS.super);
    expect(MODELS.ultra).toBe(MODEL_DEFAULTS.ultra);
    expect(MODELS.ultraFallback).toBe(MODEL_DEFAULTS.ultraFallback);
    expect(MODELS.sonic).toBe("");
    expect(tokenFactoryBase()).toBe(TOKEN_FACTORY_DEFAULT);
  });

  it("keeps a non-empty override", () => {
    previous.NEBIUS_SUPER_MODEL = process.env.NEBIUS_SUPER_MODEL;
    process.env.NEBIUS_SUPER_MODEL = "  nvidia/custom-super  ";
    expect(MODELS.super).toBe("nvidia/custom-super");
  });

  it("never leaves the closer text chain empty even if env blanks persist", () => {
    blankAllModelEnv();
    const text = appStoryTextModels();
    expect(text.length).toBeGreaterThanOrEqual(2);
    expect(text).toContain(MODEL_DEFAULTS.storyText);
    expect(text).toContain(MODEL_DEFAULTS.super);
    expect(text[0]).toBe(MODEL_DEFAULTS.storyText);
    const chain = appStoryModels();
    expect(chain[0]).toBe(MODEL_DEFAULTS.story);
    expect(chain).toContain(MODEL_DEFAULTS.storyText);
    expect(chain).toContain(MODEL_DEFAULTS.super);
    expect(textExcavateModels()).toContain(MODEL_DEFAULTS.excavateText);
    expect(textExcavateModels()).toContain(MODEL_DEFAULTS.super);
  });
});
