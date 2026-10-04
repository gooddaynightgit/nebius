/** @vitest-environment happy-dom */

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import CaptureStudio from "@/components/CaptureStudio";
import { JourneyBar } from "@/components/JourneyProgress";
import { StepForwardProvider } from "@/components/step-forward";
import { resetCaptureStashForTests } from "@/lib/capture-stash";
import { LANDING } from "@/lib/landing";
import { clearActiveMoment } from "@/lib/moment";
import { localDay } from "@/lib/day";
import { PHOTO_DATE_MESSAGES } from "@/lib/photo";

vi.mock("next/navigation", () => ({
  usePathname: () => "/app",
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  useSearchParams: () => ({ get: () => null }),
}));

vi.mock("@/lib/prepare-photo", async () => {
  const actual = await vi.importActual<typeof import("@/lib/prepare-photo")>("@/lib/prepare-photo");
  return {
    ...actual,
    normalizePhotoFile: async (file: File) => file,
    preparePhotoForUpload: async (file: File) => file,
    jpegFileForCameraStill: async (file: File) => file,
    isHeicLike: () => false,
  };
});

vi.mock("@/lib/photo-picture", async () => {
  const actual = await vi.importActual<typeof import("@/lib/photo-picture")>("@/lib/photo-picture");
  return {
    ...actual,
    blobLooksBlank: async () => false,
  };
});

const assigned: string[] = [];
let sessionPhoto: { id: string; dateVerified: boolean } | null = null;

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

describe("capture step without a photo", () => {
  let root: Root;
  let container: HTMLDivElement;

  beforeEach(() => {
    assigned.length = 0;
    sessionPhoto = null;
    resetCaptureStashForTests();
    clearActiveMoment();
    vi.spyOn(window.location, "assign").mockImplementation(((href: string) => {
      assigned.push(String(href));
    }) as Location["assign"]);
    if (!URL.createObjectURL) {
      URL.createObjectURL = () => "blob:preview";
    }
    if (!URL.revokeObjectURL) {
      URL.revokeObjectURL = () => undefined;
    }
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes("/api/session")) {
          return jsonResponse({
            sessionId: "s",
            vaultId: "v",
            email: "ada@example.com",
            captureCount: 0,
            todayCount: 0,
            canHearStory: false,
            lastStory: null,
            todayPhoto: sessionPhoto,
            hasSavedMoment: false,
            yoursOpened: false,
            canReplacePhoto: true,
            otpVerified: true,
          });
        }
        if (url.includes("/api/payfast/entitlement")) {
          return jsonResponse({ remaining: 12 });
        }
        if (url.includes("/api/yours")) return jsonResponse({ moments: [] });
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
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  async function renderCapture() {
    await act(async () => {
      root.render(
        <StepForwardProvider>
          <JourneyBar step={4} />
          <CaptureStudio />
        </StepForwardProvider>,
      );
    });
    for (let i = 0; i < 8; i += 1) {
      const forward = container.querySelector(".step-float__next") as HTMLButtonElement | null;
      const upload = container.querySelector('input[type="file"]:not([capture])');
      if (forward?.getAttribute("aria-label") === "What is the good in this moment?" && upload) return;
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 20));
      });
    }
  }

  it("loads the session once when the capture page opens", async () => {
    await renderCapture();
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 40));
    });
    const sessionCalls = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls.filter(([input]) =>
      String(input).includes("/api/session"),
    );
    expect(sessionCalls).toHaveLength(1);
  });

  it("nudges in red without leaving the page, then clears once a photo is added", async () => {
    expect(LANDING.app.photoNudge).toBe(
      "Could you please be so kind to upload a photo taken today or simply take one",
    );
    await renderCapture();
    const forward = container.querySelector(".step-float__next") as HTMLButtonElement;
    const progressNext = container.querySelector("button.journey__next") as HTMLButtonElement;
    expect(forward.disabled).toBe(false);
    expect(forward.getAttribute("aria-label")).toBe("What is the good in this moment?");
    expect(progressNext.textContent).toContain("What is the good in this moment?");
    expect(container.querySelector("#photo-need")).toBeNull();
    expect(container.querySelector(".studio-photo-actions--unset")).toBeNull();

    await act(async () => {
      forward.click();
    });
    expect(assigned).toEqual([]);
    const nudge = container.querySelector("#photo-need");
    expect(nudge?.textContent).toBe(LANDING.app.photoNudge);
    expect(container.querySelector(".studio-photo-actions--unset")).toBeTruthy();
    const actions = container.querySelector(".studio-photo-actions");
    const take = actions?.querySelector("button");
    const upload = actions?.querySelector("label");
    expect(take?.textContent).toBe(LANDING.app.takePhoto);
    expect(upload?.textContent).toBe(LANDING.app.uploadPhoto);
    expect(
      nudge && take && (nudge.compareDocumentPosition(take) & Node.DOCUMENT_POSITION_PRECEDING),
    ).toBeTruthy();

    await act(async () => {
      progressNext.click();
    });
    expect(assigned).toEqual([]);
    expect(container.querySelector("#photo-need")?.textContent).toBe(LANDING.app.photoNudge);
    expect(container.querySelector(".studio-photo-actions--unset")).toBeTruthy();
    expect(forward.disabled).toBe(false);

    const input = container.querySelector('input[type="file"]:not([capture])') as HTMLInputElement;
    const file = new File([new Uint8Array([255, 216, 255, 217])], "moment.jpg", { type: "image/jpeg" });
    await act(async () => {
      Object.defineProperty(input, "files", { configurable: true, value: [file] });
      input.dispatchEvent(new Event("change", { bubbles: true }));
    });
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 30));
    });
    expect(container.querySelector("#photo-need")).toBeNull();
    expect(container.querySelector(".studio-photo-actions--unset")).toBeNull();
    expect(container.textContent).not.toContain(LANDING.app.photoNudge);
    expect(assigned).toEqual([]);
  });

  it("nudges from the floating pill when a saved photo is not on the screen", async () => {
    sessionPhoto = { id: "cap_hidden", dateVerified: true };
    await renderCapture();
    expect(container.querySelector(".photo-preview")).toBeNull();
    const forward = container.querySelector(".step-float__next") as HTMLButtonElement;
    expect(forward.disabled).toBe(false);
    expect(forward.getAttribute("aria-label")).toBe("What is the good in this moment?");

    await act(async () => {
      forward.click();
    });
    expect(assigned).toEqual([]);
    expect(container.querySelector("#photo-need")?.textContent).toBe(LANDING.app.photoNudge);
    expect(container.querySelector(".studio-photo-actions--unset")).toBeTruthy();

    await act(async () => {
      root.unmount();
    });
    root = createRoot(container);
    await renderCapture();
    const progress = container.querySelector("button.journey__next") as HTMLButtonElement;
    expect(progress.textContent).toContain("What is the good in this moment?");
    await act(async () => {
      progress.click();
    });
    expect(container.querySelector("#photo-need")?.textContent).toBe(LANDING.app.photoNudge);
    expect(container.querySelector(".studio-photo-actions--unset")).toBeTruthy();
    expect(container.textContent).not.toContain(PHOTO_DATE_MESSAGES.today);
  });

  it("shows the today confirmation only while that photo is on screen", async () => {
    vi.spyOn(await import("@/lib/photo"), "inspectPhotoDate").mockReturnValue({
      takenDay: localDay(),
      verified: true,
      reason: "exif",
    });
    await renderCapture();
    const forward = container.querySelector(".step-float__next") as HTMLButtonElement;
    await act(async () => {
      forward.click();
    });
    expect(container.querySelector("#photo-need")?.textContent).toBe(LANDING.app.photoNudge);
    expect(container.textContent).not.toContain(PHOTO_DATE_MESSAGES.today);

    const input = container.querySelector('input[type="file"]:not([capture])') as HTMLInputElement;
    const file = new File([new Uint8Array([255, 216, 255, 217])], "moment.jpg", { type: "image/jpeg" });
    await act(async () => {
      Object.defineProperty(input, "files", { configurable: true, value: [file] });
      input.dispatchEvent(new Event("change", { bubbles: true }));
    });
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 30));
    });
    expect(container.querySelector(".photo-preview")).toBeTruthy();
    expect(container.querySelector("#photo-need")).toBeNull();
    expect(container.textContent).toContain(PHOTO_DATE_MESSAGES.today);
  });
});
