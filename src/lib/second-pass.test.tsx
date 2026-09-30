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

  it("returns to pick your joy, accepts a new joy, and opens a credited photo page", async () => {
    const day = localDay();
    await act(async () => {
      root.render(
        <StepForwardProvider>
          <JourneyBar step={2} />
          <JoyStudio />
        </StepForwardProvider>,
      );
    });

    const saved = container.querySelector(
      `input[value="${SAVED_JOY_MOMENTS_ID}"]`,
    ) as HTMLInputElement;
    expect(container.querySelector(".joy-fieldset--lime")).toBeTruthy();
    expect(container.querySelector(".joy-fieldset--unset")).toBeNull();
    expect(container.querySelector("#joy-need")).toBeNull();
    const forwardEarly = container.querySelector(".step-float__next") as HTMLButtonElement;
    const progressNext = container.querySelector("button.journey__next") as HTMLButtonElement;
    expect(forwardEarly.disabled).toBe(false);
    expect(forwardEarly.getAttribute("aria-label")).toBe("Unlock/Capture");
    expect(forwardEarly.textContent).toContain("Unlock/Capture");
    expect(progressNext.textContent).toContain("Unlock/Capture");
    await act(async () => {
      progressNext.click();
    });
    expect(assigned).toEqual([]);
    const nudge = container.querySelector("#joy-need");
    expect(nudge?.textContent).toBe(LANDING.app.joyNudge);
    expect(container.querySelector(".joy-fieldset--unset")).toBeTruthy();
    expect(container.querySelector(".joy-fieldset--lime")).toBeNull();
    const firstRadio = container.querySelector(".joy__pick input");
    expect(nudge && firstRadio && (nudge.compareDocumentPosition(firstRadio) & Node.DOCUMENT_POSITION_FOLLOWING)).toBeTruthy();
    await act(async () => {
      forwardEarly.click();
    });
    expect(assigned).toEqual([]);
    expect(container.querySelector("#joy-need")?.textContent).toBe(LANDING.app.joyNudge);
    const catalog = container.querySelector('input[value="a-small-hello"]') as HTMLInputElement;
    await act(async () => {
      catalog.click();
    });
    expect(catalog.checked).toBe(true);
    expect(container.querySelector("#joy-need")).toBeNull();
    expect(container.querySelector(".joy-fieldset--unset")).toBeNull();
    expect(container.querySelector(".joy-fieldset--lime")).toBeTruthy();
    expect(container.textContent).not.toContain(LANDING.app.joyNudge);
    const back = container.querySelector(".step-float__back");
    expect(back?.getAttribute("aria-label")).toBe("Back to start");
    expect(back?.getAttribute("href")).toBe("/");
    expect(back?.textContent).not.toContain("Weave your good moment");
    const main = container.querySelector("main");
    expect(main?.compareDocumentPosition(back!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(container.querySelector(".step-pin")).toBeNull();
    await act(async () => {
      saved.click();
    });
    expect(saved.checked).toBe(true);
    expect(container.querySelector(".joy-fieldset--unset")).toBeNull();
    expect(container.querySelector(".joy-fieldset--lime")).toBeTruthy();
    expect(container.querySelector("#joy-need")).toBeNull();
    expect(container.textContent).not.toContain("Pick the kind of quiet joy first.");
    expect(assigned).toEqual(["/app/yours"]);

    writeChosenJoy(day, "just-this");
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
    expect(container.querySelector(".joy-fieldset--lime")).toBeTruthy();
    expect(container.textContent).not.toContain("Pick the kind of quiet joy first.");

    const nextJoy = container.querySelector('input[value="morning-sunlight"]') as HTMLInputElement;
    await act(async () => {
      nextJoy.click();
    });
    const forward = container.querySelector(".step-float__next") as HTMLButtonElement;
    expect(forward.disabled).toBe(false);
    expect(forward.getAttribute("aria-label")).toBe("Unlock/Capture");
    await act(async () => {
      forward.click();
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
