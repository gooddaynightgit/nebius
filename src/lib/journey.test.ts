import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  JOURNEY_FINISHED_CAPTION,
  JOURNEY_STEPS,
  journeyBackHref,
  journeyClickableSteps,
  journeyFillPercent,
  journeyStateAfterBack,
  journeyStep,
  restoredJoyId,
  restoredMomentText,
  reviewCaptureView,
} from "./journey";
import { LANDING } from "./landing";

function search(query: string): { get(name: string): string | null } {
  return new URLSearchParams(query);
}

describe("journey progress", () => {
  it("maps each visitor step and hides unrelated routes", () => {
    expect(journeyStep("/", search(""), "unknown")).toBe(1);
    expect(journeyStep("/app/joy", search(""), "locked")).toBe(2);
    expect(journeyStep("/moments", search(""), "open")).toBe(3);
    expect(journeyStep("/signin", search(""), "locked")).toBe(3);
    expect(journeyStep("/signin/", search(""), "unknown")).toBe(3);
    expect(journeyStep("/moments/", search("cancelled=1"), "unknown")).toBe(3);
    expect(journeyStep("/app/yours", search(""), "locked")).toBe(6);
    expect(journeyStep("/app/yours", search(""), "open", "turn")).toBe(6);
    expect(journeyStep("/app/yours", search(""), "open", "weaved")).toBe(8);
    expect(journeyStep("/about", search(""), "open")).toBeNull();
    expect(journeyStep("/about/", search(""), "unknown")).toBeNull();
    expect(journeyStep("/api/session", search(""), "open")).toBeNull();
    expect(journeyStep("/health", search(""), "open")).toBeNull();
  });

  it("keeps Unlock current until the buyer gate opens, and treats a PayFast return as the photo step", () => {
    expect(journeyStep("/app", search(""), "unknown")).toBe(3);
    expect(journeyStep("/app", search(""), "locked")).toBe(3);
    expect(journeyStep("/app", search("cancelled=1"), "locked")).toBe(3);
    expect(journeyStep("/app", search(""), "open")).toBe(4);
    expect(journeyStep("/app", search(""), "open", "good")).toBe(5);
    expect(journeyStep("/app", search(""), "open", "turn")).toBe(6);
    expect(journeyStep("/app", search(""), "locked", "good")).toBe(3);
    expect(journeyStep("/app/", search("paid=1&ref=pf-22"), "unknown")).toBe(4);
    expect(journeyStep("/app", search("paid=1&ref=pf-22"), "locked")).toBe(4);
    expect(journeyStep("/app", search("paid=1&ref=pf-22"), "open")).toBe(4);
    expect(journeyStep("/app", search("paid=1&ref=pf-22"), "unknown", "turn")).toBe(6);
    expect(journeyStep("/moments", search("cancelled=1"), "open")).toBe(3);
  });

  it("names seven steps and ticks every dot only once the story is weaved", () => {
    expect(JOURNEY_STEPS.map((step) => step.label)).toEqual([
      "Weave your good moment",
      "Pick your joy",
      "Unlock your good moments",
      "Capture it",
      "What is the good in this moment?",
      "Weave my good moment",
      "My good moment weaved",
    ]);
    expect(JOURNEY_FINISHED_CAPTION).toBe("My good moment weaved");
    expect(LANDING.app.yours).toBe(JOURNEY_FINISHED_CAPTION);
    expect(JOURNEY_STEPS).toHaveLength(7);
    expect(journeyStep("/app/yours", search(""), "open")).toBe(6);
    expect(journeyStep("/app", search(""), "open", "turn")).toBe(6);
    expect(journeyStep("/app/yours", search(""), "open", "weaved")).toBe(8);
    expect(journeyFillPercent(8)).toBe(100);
  });

  it("fills the track only through completed steps", () => {
    expect(journeyFillPercent(1)).toBe(0);
    expect(journeyFillPercent(2)).toBe((1 / 6) * 100);
    expect(journeyFillPercent(3)).toBe((2 / 6) * 100);
    expect(journeyFillPercent(4)).toBe((3 / 6) * 100);
    expect(journeyFillPercent(5)).toBe((4 / 6) * 100);
    expect(journeyFillPercent(6)).toBe((5 / 6) * 100);
    expect(journeyFillPercent(7)).toBe(100);
    expect(journeyFillPercent(8)).toBe(100);
  });

  it("spaces seven dots and paints only the finished story card", () => {
    const css = readFileSync(path.resolve("src/app/globals.css"), "utf8");
    const yours = readFileSync(path.resolve("src/components/YoursStory.tsx"), "utf8");
    expect(css).toMatch(/grid-template-columns:\s*repeat\(7,\s*minmax\(0,\s*1fr\)\)/);
    expect(css).toMatch(/calc\(100% \/ 14\)/);
    const finished = css.match(/#yours\.card--lavender \{[^}]+\}/)?.[0] ?? "";
    expect(finished).toMatch(/rgba\(255,\s*255,\s*255,\s*0\.06\)/);
    expect(finished).toMatch(/rgba\(212,\s*255,\s*0,\s*0\.35\)/);
    expect(finished).not.toMatch(/weave-silk/);
    expect(finished).not.toMatch(/#ffe45c|#ffea7a|#bfeefe|#b9f9df/);
    expect(css).toMatch(
      /body:has\(#yours\) \{[^}]*linear-gradient\(hsl\(223,\s*90%,\s*30%\),\s*hsl\(223,\s*90%,\s*10%\)\)/,
    );
    const plain = css.match(/\.card--lavender \{[^}]+\}/)?.[0] ?? "";
    expect(plain).toMatch(/#ebe7fb/);
    expect(plain).not.toMatch(/weave-silk/);
    const bar = readFileSync(path.resolve("src/components/JourneyProgress.tsx"), "utf8");
    expect(bar).toMatch(/className="journey__end"/);
    expect(bar).toMatch(/finished \? null/);
    expect(bar).toMatch(/journey__captions--finished/);
    expect(yours).toMatch(/useReportAppProgress\(state\.status === "ready" \? "weaved" : "turn"\)/);
  });

  it("makes only completed steps clickable and sends each one to its page", () => {
    expect(journeyClickableSteps(4, 4)).toEqual([1, 2, 3]);
    expect(journeyClickableSteps(1, 1)).toEqual([]);
    expect(journeyClickableSteps(8, 8)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(journeyClickableSteps(4, 8)).toEqual([1, 2, 3, 5, 6, 7]);
    expect(journeyClickableSteps(6, 6)).not.toContain(6);
    expect(journeyClickableSteps(6, 6)).not.toContain(7);
    expect(journeyBackHref(1)).toBe("/");
    expect(journeyBackHref(2)).toBe("/app/joy");
    expect(journeyBackHref(3)).toBe("/moments");
    expect(journeyBackHref(4)).toBe("/app?review=capture");
    expect(journeyBackHref(5)).toBe("/app?review=good");
    expect(journeyBackHref(6)).toBe("/app?review=weave");
    expect(journeyBackHref(7)).toBe("/app/yours");
    expect(journeyBackHref(0)).toBeNull();
    expect(journeyBackHref(8)).toBeNull();
    const bar = readFileSync(path.resolve("src/components/JourneyProgress.tsx"), "utf8");
    const css = readFileSync(path.resolve("src/app/globals.css"), "utf8");
    expect(bar).toMatch(/Go back to \$\{item\.label\}/);
    expect(bar).toMatch(/journey__jump/);
    expect(bar).toMatch(/href \? \(/);
    expect(css).toMatch(/\.journey__jump[\s\S]*min-height:\s*44px/);
    expect(css).toMatch(/\.journey__jump[\s\S]*cursor:\s*pointer/);
  });

  it("keeps joy, credit, photo, description, and story when jumping back", () => {
    const kept = {
      joyId: "morning-sunlight",
      credits: 40,
      photoId: "cap_1",
      caption: "Pre breakfast chocolate",
      storyId: "story_1",
    };
    for (const step of [1, 2, 3, 4, 5, 6, 7]) {
      const back = journeyStateAfterBack(step, kept);
      expect(back.href).toBe(journeyBackHref(step));
      expect(back.charged).toBe(false);
      expect(back.reset).toBe(false);
      expect(back.state).toEqual(kept);
      expect(back.state).not.toBe(kept);
    }
    expect(reviewCaptureView({
      review: "capture",
      busy: false,
      questionOpen: true,
      hasPhoto: true,
      hasCaption: true,
    })).toMatchObject({ progress: "upload", showQuestion: true, showWeave: false, charged: false, reset: false });
    expect(reviewCaptureView({
      review: "good",
      busy: false,
      questionOpen: false,
      hasPhoto: true,
      hasCaption: true,
    })).toMatchObject({ progress: "good", showQuestion: true, showWeave: false, charged: false, reset: false });
    expect(reviewCaptureView({
      review: "good",
      busy: false,
      questionOpen: false,
      hasPhoto: false,
      hasCaption: false,
    })).toMatchObject({ progress: "upload", showQuestion: false, showWeave: false });
    expect(reviewCaptureView({
      review: "weave",
      busy: false,
      questionOpen: false,
      hasPhoto: true,
      hasCaption: true,
    })).toMatchObject({ progress: "turn", showQuestion: true, showWeave: true, charged: false, reset: false });
    expect(reviewCaptureView({
      review: "weave",
      busy: false,
      questionOpen: false,
      hasPhoto: false,
      hasCaption: false,
    })).toMatchObject({ progress: "upload", showQuestion: false, showWeave: false });
    expect(reviewCaptureView({
      review: null,
      busy: false,
      questionOpen: true,
      hasPhoto: true,
      hasCaption: false,
    })).toMatchObject({ progress: "good", showQuestion: true, showWeave: true });
  });

  it("shows the joy, photo, and description already kept when a step is opened again", () => {
    expect(restoredJoyId("morning-sunlight", "just-this", "a-small-hello")).toBe("morning-sunlight");
    expect(restoredJoyId(null, "just-this", "a-small-hello")).toBe("just-this");
    expect(restoredJoyId(null, null, "a-small-hello")).toBe("a-small-hello");
    expect(restoredJoyId("saved-joy-moments", null, "just-this")).toBe("just-this");
    expect(restoredJoyId(null, null, null)).toBeNull();
    expect(restoredMomentText({
      currentCaption: "",
      stashCaption: "Pre breakfast chocolate",
      photoCaption: "other",
    })).toBe("Pre breakfast chocolate");
    expect(restoredMomentText({
      currentCaption: "  ",
      stashCaption: "",
      photoCaption: "gold on the table",
    })).toBe("gold on the table");
    expect(restoredMomentText({
      currentCaption: "kept on screen",
      stashCaption: "stash",
      photoCaption: "photo",
    })).toBe("kept on screen");
    const joy = readFileSync(path.resolve("src/components/JoyStudio.tsx"), "utf8");
    const capture = readFileSync(path.resolve("src/components/CaptureStudio.tsx"), "utf8");
    expect(joy).toMatch(/useLayoutEffect/);
    expect(joy).toMatch(/restoredJoyId/);
    expect(capture).toMatch(/restoredMomentText/);
    expect(capture).toMatch(/restoredJoyId/);
    expect(capture).toMatch(/keptMediaUrl/);
  });
});
