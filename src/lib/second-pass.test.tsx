/** @vitest-environment happy-dom */

import { readFileSync } from "node:fs";
import path from "node:path";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { JourneyBar } from "@/components/JourneyProgress";
import JoyStudio from "@/components/JoyStudio";
import { StepForwardProvider } from "@/components/step-forward";
import { LANDING } from "@/lib/landing";
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

  async function renderJoy() {
    await act(async () => {
      root.render(
        <StepForwardProvider>
          <JourneyBar step={2} />
          <JoyStudio />
        </StepForwardProvider>,
      );
    });
  }

  it("shows no floating pill and no Capture it until a good feeling is picked", async () => {
    await renderJoy();
    expect(container.querySelector(".step-float__next")).toBeNull();
    expect(container.querySelector(".step-pin")).toBeNull();
    expect(container.querySelector(".feel-good-capture")).toBeNull();
    expect(container.querySelector("#joy-need")).toBeNull();
    const catalog = container.querySelector('input[value="a-small-hello"]') as HTMLInputElement;
    await act(async () => {
      catalog.click();
    });
    expect(catalog.checked).toBe(true);
    expect(container.querySelector(".feel-good-capture button")?.textContent).toContain("Capture it");
    expect(container.textContent).not.toContain(LANDING.app.joyNudge);
    expect(assigned).toEqual([]);
  });

  it("returns to pick your joy, accepts a new joy, and opens a credited photo page", async () => {
    const day = localDay();
    await renderJoy();

    const saved = container.querySelector(
      `input[value="${SAVED_JOY_MOMENTS_ID}"]`,
    ) as HTMLInputElement;
    await act(async () => {
      saved.click();
    });
    expect(assigned).toEqual(["/app/yours"]);

    writeChosenJoy(day, "just-this");
    assigned.length = 0;
    await act(async () => {
      window.dispatchEvent(new PageTransitionEvent("pageshow", { persisted: true }));
    });
    const kept = container.querySelector('input[value="just-this"]') as HTMLInputElement;
    expect(kept.checked).toBe(true);

    const nextJoy = container.querySelector('input[value="morning-sunlight"]') as HTMLInputElement;
    await act(async () => {
      nextJoy.click();
    });
    const capture = container.querySelector(".feel-good-capture button") as HTMLButtonElement;
    expect(capture.textContent).toContain("Capture it");
    await act(async () => {
      capture.click();
    });
    expect(assigned).toEqual(["/app"]);
    expect(uploadPhotoDestination(true, 39)).toBe("/app");
    expect(photoButtonsEnabled(true, 39)).toBe(true);
    expect(uploadPhotoDestination(true, 0)).toBe("/moments");
    expect(photoButtonsEnabled(true, 0)).toBe(false);

    const captureSrc = readFileSync(path.resolve("src/components/CaptureStudio.tsx"), "utf8");
    expect(captureSrc).toMatch(/releaseCaptureVisit/);
    expect(captureSrc).toMatch(/photoButtonsEnabled/);
    expect(captureSrc).toMatch(/const canPickPhoto = captureOpen;/);
    expect(captureSrc).toMatch(/clearActiveMoment\(\)/);
    expect(captureSrc).not.toMatch(/hasSavedMoment[\s\S]{0,80}canPickPhoto/);
  });
});
