import { readFileSync } from "node:fs";
import path from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import JoyPicker from "@/components/JoyPicker";
import { accordionJoys, getJoyById } from "@/lib/landing";
import {
  SAVED_JOY_MOMENTS_HREF,
  SAVED_JOY_MOMENTS_ID,
  SAVED_JOY_MOMENTS_LABEL,
  chooseStoryJoy,
  isSavedJoyMomentsId,
  openSavedJoyMoments,
} from "@/lib/saved-joy-moments";

describe("saved joy moments", () => {
  it("reuses the former See your Created story href and is not a catalog joy", () => {
    expect(SAVED_JOY_MOMENTS_HREF).toBe("/app/yours");
    expect(SAVED_JOY_MOMENTS_LABEL).toBe("Your saved joy moments");
    expect(isSavedJoyMomentsId(SAVED_JOY_MOMENTS_ID)).toBe(true);
    expect(isSavedJoyMomentsId("morning-sunlight")).toBe(false);
    expect(getJoyById(SAVED_JOY_MOMENTS_ID)).toBeUndefined();
    expect(accordionJoys().some((joy) => joy.id === SAVED_JOY_MOMENTS_ID)).toBe(false);
  });

  it("navigates to /app/yours without writing a chosen joy", () => {
    const visited: string[] = [];
    openSavedJoyMoments((href) => visited.push(href));
    expect(visited).toEqual(["/app/yours"]);

    const written: string[] = [];
    expect(chooseStoryJoy(SAVED_JOY_MOMENTS_ID, (id) => written.push(id))).toBe(false);
    expect(chooseStoryJoy("morning-sunlight", (id) => written.push(id))).toBe(true);
    expect(chooseStoryJoy("a-small-hello", (id) => written.push(id))).toBe(true);
    expect(written).toEqual(["morning-sunlight", "a-small-hello"]);
  });

  it("renders the saved-moments radio after the catalog joys and leaves the landing picker unchanged", () => {
    const chosen: string[] = [];
    const html = renderToStaticMarkup(
      <JoyPicker
        name="quiet-joy-app"
        joys={accordionJoys()}
        onSelect={(joy) => chosen.push(joy.id)}
        trailingChoice={{
          id: SAVED_JOY_MOMENTS_ID,
          title: SAVED_JOY_MOMENTS_LABEL,
          onChoose: () => chosen.push(SAVED_JOY_MOMENTS_ID),
        }}
      />,
    );
    const landing = renderToStaticMarkup(<JoyPicker />);

    expect(html.match(/type="radio"/g)?.length).toBe(accordionJoys().length + 1);
    expect(landing.match(/type="radio"/g)?.length).toBe(accordionJoys().length);
    expect(landing).not.toContain(SAVED_JOY_MOMENTS_LABEL);

    const lastTitle = html.lastIndexOf("joy__title");
    expect(html.slice(lastTitle)).toContain(SAVED_JOY_MOMENTS_LABEL);
    expect(html.indexOf("Morning sunlight")).toBeGreaterThan(-1);
    expect(html.indexOf(SAVED_JOY_MOMENTS_LABEL)).toBeGreaterThan(html.indexOf("Just this"));
    expect(html).toContain(`name="quiet-joy-app"`);
    expect(html).toContain(`value="${SAVED_JOY_MOMENTS_ID}"`);
    expect(html).toContain("<label");
    expect(html).not.toContain("See your Created story");
    expect(html).not.toContain(`playback-${SAVED_JOY_MOMENTS_ID}`);
    expect(chosen).toEqual([]);
  });

  it("styles only the joy-page heading with navy and lime tokens", () => {
    const joy = readFileSync(path.resolve("src/components/JoyStudio.tsx"), "utf8");
    const styles = readFileSync(path.resolve("src/app/globals.css"), "utf8");
    const capture = readFileSync(path.resolve("src/components/CaptureStudio.tsx"), "utf8");

    expect(joy).toMatch(/className="step-heading step-heading--navy"/);
    expect(joy).not.toMatch(/already-picked/);
    expect(capture).not.toMatch(/step-heading--navy/);
    expect(styles).toMatch(
      /\.card h2\.step-heading\.step-heading--navy\s*\{[^}]*background:\s*var\(--navy\);[^}]*color:\s*var\(--lime\);/,
    );
    expect(styles).not.toMatch(/\.already-picked/);
  });
});
