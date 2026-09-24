/** @vitest-environment happy-dom */

import { readFileSync } from "node:fs";
import path from "node:path";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import JoyStudio from "@/components/JoyStudio";
import { resetChosenJoyForTests, writeChosenJoy } from "@/lib/chosen-joy";
import { localDay } from "@/lib/day";
import { photoButtonsEnabled, uploadPhotoDestination } from "@/lib/photo-entry";
import { SAVED_JOY_MOMENTS_ID } from "@/lib/saved-joy-moments";

const assigned: string[] = [];

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

describe("second pass after a finished story", () => {
  let root: Root;
  let container: HTMLDivElement;

  beforeEach(() => {
    resetChosenJoyForTests();
    assigned.length = 0;
    vi.spyOn(window.location, "assign").mockImplementation(((href: string) => {
      assigned.push(String(href));
    }) as Location["assign"]);
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes("/api/session")) {
          return jsonResponse({ otpVerified: true, email: "owner@example.com" });
        }
        if (url.includes("/api/payfast/entitlement")) {
          return jsonResponse({ remaining: 39 });
        }
        return jsonResponse({});
      }),
    );
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    resetChosenJoyForTests();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("returns to pick your joy, accepts a new joy, and opens a credited photo page", async () => {
    const day = localDay();
    await act(async () => {
      root.render(<JoyStudio />);
    });

    const saved = container.querySelector(
      `input[value="${SAVED_JOY_MOMENTS_ID}"]`,
    ) as HTMLInputElement;
    await act(async () => {
      saved.click();
    });
    expect(saved.checked).toBe(true);
    expect(container.textContent).toContain("Pick the kind of quiet joy first.");
    expect(assigned).toEqual(["/app/yours"]);

    writeChosenJoy(day, "just-this");
    assigned.length = 0;
    const upload = container.querySelector("button.step-next") as HTMLButtonElement;
    await act(async () => {
      upload.click();
    });
    expect(assigned).toEqual(["/app"]);

    assigned.length = 0;
    await act(async () => {
      window.dispatchEvent(new PageTransitionEvent("pageshow", { persisted: true }));
    });
    const savedAfter = container.querySelector(
      `input[value="${SAVED_JOY_MOMENTS_ID}"]`,
    ) as HTMLInputElement;
    const kept = container.querySelector('input[value="just-this"]') as HTMLInputElement;
    expect(savedAfter.checked).toBe(false);
    expect(kept.checked).toBe(true);
    expect(container.textContent).not.toContain("Pick the kind of quiet joy first.");

    const nextJoy = container.querySelector('input[value="morning-sunlight"]') as HTMLInputElement;
    await act(async () => {
      nextJoy.click();
      upload.click();
    });
    expect(assigned).toEqual(["/app"]);
    expect(uploadPhotoDestination(true, 39)).toBe("/app");
    expect(photoButtonsEnabled(true, 39)).toBe(true);
    expect(uploadPhotoDestination(true, 0)).toBe("/moments");
    expect(photoButtonsEnabled(true, 0)).toBe(false);

    const capture = readFileSync(path.resolve("src/components/CaptureStudio.tsx"), "utf8");
    expect(capture).toMatch(/releaseCaptureVisit/);
    expect(capture).toMatch(/photoButtonsEnabled/);
    expect(capture).toMatch(/const canPickPhoto = captureOpen;/);
    expect(capture).toMatch(/clearActiveMoment\(\)/);
    expect(capture).not.toMatch(/hasSavedMoment[\s\S]{0,80}canPickPhoto/);
  });
});
