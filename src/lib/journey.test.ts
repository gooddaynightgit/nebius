import { describe, expect, it } from "vitest";
import { JOURNEY_STEPS, journeyFillPercent, journeyStep } from "./journey";
import { LANDING } from "./landing";

function search(query: string): { get(name: string): string | null } {
  return new URLSearchParams(query);
}

describe("journey progress", () => {
  it("maps each visitor step and hides unrelated routes", () => {
    expect(journeyStep("/", search(""), "unknown")).toBe(1);
    expect(journeyStep("/app/joy", search(""), "locked")).toBe(2);
    expect(journeyStep("/moments", search(""), "open")).toBe(3);
    expect(journeyStep("/moments/", search("cancelled=1"), "unknown")).toBe(3);
    expect(journeyStep("/app/yours", search(""), "locked")).toBe(5);
    expect(journeyStep("/api/session", search(""), "open")).toBeNull();
    expect(journeyStep("/health", search(""), "open")).toBeNull();
  });

  it("keeps Unlock current until the buyer gate opens, and treats a PayFast return as the photo step", () => {
    expect(journeyStep("/app", search(""), "unknown")).toBe(3);
    expect(journeyStep("/app", search(""), "locked")).toBe(3);
    expect(journeyStep("/app", search("cancelled=1"), "locked")).toBe(3);
    expect(journeyStep("/app", search(""), "open")).toBe(4);
    expect(journeyStep("/app/", search("paid=1&ref=pf-22"), "unknown")).toBe(4);
    expect(journeyStep("/app", search("paid=1&ref=pf-22"), "locked")).toBe(4);
    expect(journeyStep("/app", search("paid=1&ref=pf-22"), "open")).toBe(4);
    expect(journeyStep("/moments", search("cancelled=1"), "open")).toBe(3);
  });

  it("names the fifth step Create your story, matching the story CTA", () => {
    expect(JOURNEY_STEPS.map((step) => step.label)).toEqual([
      "Start",
      "Pick your joy",
      "Unlock",
      "Your photo",
      "Create your story",
    ]);
    expect(LANDING.app.yours).toBe(JOURNEY_STEPS[4].label);
  });

  it("fills the track only through completed steps", () => {
    expect(journeyFillPercent(1)).toBe(0);
    expect(journeyFillPercent(2)).toBe(25);
    expect(journeyFillPercent(3)).toBe(50);
    expect(journeyFillPercent(4)).toBe(75);
    expect(journeyFillPercent(5)).toBe(100);
  });
});
