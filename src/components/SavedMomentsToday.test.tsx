/** @vitest-environment happy-dom */

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import SavedMomentsToday from "@/components/SavedMomentsToday";
import { SAVED_TODAY_EMPTY, SAVED_TODAY_LABEL, type TodaySavedMoment } from "@/lib/saved-today";

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const moments: TodaySavedMoment[] = [
  {
    id: "late",
    day: "2026-09-27",
    createdAt: "2026-09-27T16:41:00.000Z",
    captureId: "cap_late",
    excerpt: "I kept the laugh that found me on the walk home.",
    time: "18:41",
  },
  {
    id: "early",
    day: "2026-09-27",
    createdAt: "2026-09-27T05:12:00.000Z",
    captureId: null,
    excerpt: "I stepped into the early gold and let\u2026",
    time: "07:12",
  },
];

describe("saved moments dropdown", () => {
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

  it("stays collapsed, then lists today's moments with a thumbnail, SAST time, and story words", async () => {
    await act(async () => {
      root.render(<SavedMomentsToday moments={moments} />);
    });

    const button = container.querySelector("button");
    const panel = container.querySelector(".noticing__panel");
    expect(button?.getAttribute("type")).toBe("button");
    expect(button?.getAttribute("aria-expanded")).toBe("false");
    expect(button?.textContent).toContain(SAVED_TODAY_LABEL);
    expect(button?.className).toContain("pastel-banner");
    expect(button?.className).toContain("noticing__bar");
    expect(container.querySelector(".noticing__chevron")).not.toBeNull();
    expect(panel?.hasAttribute("hidden")).toBe(true);
    expect(container.textContent).not.toContain(SAVED_TODAY_EMPTY);

    await act(async () => {
      button?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(button?.getAttribute("aria-expanded")).toBe("true");
    expect(panel?.hasAttribute("hidden")).toBe(false);
    const links = [...container.querySelectorAll("a.saved-today__link")];
    expect(links).toHaveLength(2);
    expect(links[0]?.getAttribute("href")).toBe("/app/yours?story=late");
    expect(links[0]?.textContent).toContain("18:41");
    expect(links[0]?.textContent).toContain("I kept the laugh");
    expect(links[0]?.querySelector("img")?.getAttribute("src")).toBe("/api/media/cap_late");
    expect(links[1]?.getAttribute("href")).toBe("/app/yours?story=early");
    expect(links[1]?.textContent).toContain("07:12");
    expect(links[1]?.querySelector("img")).toBeNull();
  });

  it("says there are no saved moments yet when today is empty", async () => {
    await act(async () => {
      root.render(<SavedMomentsToday moments={[]} />);
    });
    const button = container.querySelector("button");
    await act(async () => {
      button?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(container.querySelector(".noticing__empty")?.textContent).toBe(SAVED_TODAY_EMPTY);
    expect(container.querySelectorAll("a.saved-today__link")).toHaveLength(0);
  });
});
