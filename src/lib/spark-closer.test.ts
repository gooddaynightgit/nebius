import { afterEach, describe, expect, it, vi } from "vitest";
import { mockExcavation } from "./prompts";
import {
  EXCAVATE_OPENERS,
  HUMBLE_CLOSERS,
  applySparkVoice,
  chooseSparkVoice,
  readSparkVoiceMemory,
  writeSparkVoiceMemory,
} from "./spark-closer";

const STUCK_MODEL =
  "Aha! A digital message on a phone screen, showing a service guarantee and a credit for a delivery fee, with a 'Shop again' button. Wanted to confirm I read that correctly?";

describe("spark voice rotation", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("varies 50 requests and replaces a stuck Aha / confirm pair", () => {
    let n = 0;
    const random = () => {
      n += 1;
      return ((n * 17) % 100) / 100;
    };
    let previous: { openerIndex: number; closerIndex: number } | null = null;
    const openers = new Set<string>();
    const closers = new Set<string>();
    for (let i = 0; i < 50; i += 1) {
      const voice = chooseSparkVoice(previous, random);
      if (previous) {
        expect(voice.openerIndex).not.toBe(previous.openerIndex);
        expect(voice.closerIndex).not.toBe(previous.closerIndex);
      }
      const dressed = applySparkVoice(STUCK_MODEL, voice);
      expect(dressed.startsWith(`${voice.opener}! `)).toBe(true);
      expect(dressed.endsWith(` ${voice.closer}`)).toBe(true);
      expect(dressed).toContain("Shop again");
      if (voice.opener !== "Aha") expect(dressed.startsWith("Aha!")).toBe(false);
      if (voice.closer !== HUMBLE_CLOSERS[0]) expect(dressed.endsWith(HUMBLE_CLOSERS[0])).toBe(false);
      const mock = applySparkVoice(mockExcavation({ voice }), voice);
      expect(mock.startsWith(`${voice.opener}! `)).toBe(true);
      expect(mock.endsWith(` ${voice.closer}`)).toBe(true);
      openers.add(voice.opener);
      closers.add(voice.closer);
      previous = voice;
    }
    expect(openers.size).toBeGreaterThanOrEqual(5);
    expect(closers.size).toBeGreaterThanOrEqual(5);
    expect(openers.size).toBeLessThanOrEqual(EXCAVATE_OPENERS.length);
  });

  it("skips the previous index even when the roll lands on it", () => {
    let previous: { openerIndex: number; closerIndex: number } | null = null;
    for (let i = 0; i < 50; i += 1) {
      const voice = chooseSparkVoice(previous, () => 0);
      if (previous) {
        expect(voice.openerIndex).not.toBe(previous.openerIndex);
        expect(voice.closerIndex).not.toBe(previous.closerIndex);
      }
      previous = voice;
    }
  });

  it("strips common leading interjections and a trailing confirm question", () => {
    const voice = { opener: "Gosh", closer: HUMBLE_CLOSERS[3] };
    expect(applySparkVoice("Wow! A kettle on the stove. Did I see that right?", voice)).toBe(
      `Gosh! A kettle on the stove. ${HUMBLE_CLOSERS[3]}`,
    );
    expect(applySparkVoice("Oh, a dry car in a garage. Am I seeing this right?", voice)).toBe(
      `Gosh! A dry car in a garage. ${HUMBLE_CLOSERS[3]}`,
    );
    expect(applySparkVoice("Ooh! Steam over the cup.", voice)).toBe(
      `Gosh! Steam over the cup. ${HUMBLE_CLOSERS[3]}`,
    );
    expect(applySparkVoice("BLOCK", voice)).toBe("BLOCK");
  });

  it("stores the last pick and feeds it into the next choice", () => {
    const store = new Map<string, string>();
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value);
      },
      removeItem: (key: string) => {
        store.delete(key);
      },
    });
    expect(readSparkVoiceMemory()).toBeNull();
    let previous = readSparkVoiceMemory();
    const seen = new Set<string>();
    let n = 0;
    const random = () => {
      n += 1;
      return ((n * 13) % 100) / 100;
    };
    for (let i = 0; i < 50; i += 1) {
      const voice = chooseSparkVoice(previous, random);
      if (previous) {
        expect(voice.openerIndex).not.toBe(previous.openerIndex);
        expect(voice.closerIndex).not.toBe(previous.closerIndex);
      }
      writeSparkVoiceMemory(voice);
      previous = readSparkVoiceMemory();
      expect(previous).toEqual({ openerIndex: voice.openerIndex, closerIndex: voice.closerIndex });
      seen.add(voice.opener);
    }
    expect(seen.size).toBeGreaterThanOrEqual(5);
  });
});
