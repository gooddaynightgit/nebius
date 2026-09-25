/** @vitest-environment happy-dom */

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import NoticingMoments from "@/components/NoticingMoments";
import { LANDING } from "@/lib/landing";

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

describe("moments worth noticing", () => {
  let root: Root;
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it("stays collapsed until the header button opens it", async () => {
    await act(async () => {
      root.render(<NoticingMoments />);
    });

    const button = container.querySelector("button");
    const panel = container.querySelector(".noticing__panel");
    expect(button).not.toBeNull();
    expect(button?.tagName).toBe("BUTTON");
    expect(button?.getAttribute("type")).toBe("button");
    expect(button?.getAttribute("aria-expanded")).toBe("false");
    expect(button?.textContent).toContain("Moments worth noticing:");
    expect(button?.className).toContain("pastel-banner");
    expect(panel?.id).toBe(button?.getAttribute("aria-controls"));
    expect(panel?.hasAttribute("hidden")).toBe(true);
    expect(container.querySelectorAll(".noticing__panel li")).toHaveLength(LANDING.app.noticing.length);
    expect(container.querySelector(".noticing__close")).toBeNull();
    expect(container.textContent).not.toContain("already gone");
    expect(container.textContent).toContain("Nothing happening — and it feeling like peace");
    expect(container.textContent).toContain("Rain on the roof while you’re warm inside");

    await act(async () => {
      button?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(button?.getAttribute("aria-expanded")).toBe("true");
    expect(panel?.hasAttribute("hidden")).toBe(false);
    expect(container.querySelector(".noticing")?.className).toContain("is-open");
  });
});
