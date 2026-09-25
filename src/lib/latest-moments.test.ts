import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { LATEST_MOMENTS_LIMIT, latestMoments, momentListLabel } from "@/lib/latest-moments";

function moment(id: string, createdAt: string) {
  return { id, createdAt, day: createdAt.slice(0, 10), note: id };
}

describe("latestMoments", () => {
  const newestFirst = [
    moment("m12", "2026-09-20T08:00:00.000Z"),
    moment("m11", "2026-09-20T07:15:00.000Z"),
    moment("m10", "2026-09-19T21:40:00.000Z"),
    moment("m09", "2026-09-18T18:05:00.000Z"),
    moment("m08", "2026-09-17T16:30:00.000Z"),
    moment("m07", "2026-09-16T12:10:00.000Z"),
    moment("m06", "2026-09-15T09:45:00.000Z"),
    moment("m05", "2026-09-14T23:20:00.000Z"),
    moment("m04", "2026-09-13T11:00:00.000Z"),
    moment("m03", "2026-09-12T08:00:00.000Z"),
    moment("m02", "2026-09-11T08:00:00.000Z"),
    moment("m01", "2026-09-10T08:00:00.000Z"),
  ];

  it("keeps only the 8 newest, newest first, and leaves the source list alone", () => {
    const source = [...newestFirst].reverse();
    const before = source.map((item) => item.id);
    const listed = latestMoments(source);

    expect(LATEST_MOMENTS_LIMIT).toBe(8);
    expect(listed).toHaveLength(8);
    expect(listed.map((item) => item.id)).toEqual([
      "m12",
      "m11",
      "m10",
      "m09",
      "m08",
      "m07",
      "m06",
      "m05",
    ]);
    expect(listed.map((item) => item.createdAt)).toEqual(
      [...listed.map((item) => item.createdAt)].sort((a, b) => b.localeCompare(a)),
    );
    expect(source.map((item) => item.id)).toEqual(before);
    expect(listed.map((item) => item.id)).not.toContain("m04");
  });

  it("drops the story already on screen, then still shows 8 other moments", () => {
    const listed = latestMoments(newestFirst, { excludeId: "m12" });
    expect(listed).toHaveLength(8);
    expect(listed.map((item) => item.id)).toEqual([
      "m11",
      "m10",
      "m09",
      "m08",
      "m07",
      "m06",
      "m05",
      "m04",
    ]);
    expect(listed.map((item) => item.id)).not.toContain("m12");
  });

  it("sorts by created time when two moments share a day", () => {
    const listed = latestMoments([
      moment("later", "2026-09-20T07:15:00.000Z"),
      moment("earlier", "2026-09-20T08:00:00.000Z"),
    ]);
    expect(listed.map((item) => item.id)).toEqual(["earlier", "later"]);
    expect(momentListLabel(listed[0])).toBe("2026-09-20 · 08:00");
    expect(momentListLabel(listed[1])).toBe("2026-09-20 · 07:15");
  });

  it("returns every moment when there are fewer than 8", () => {
    expect(latestMoments(newestFirst.slice(0, 3))).toHaveLength(3);
  });

  it("is the display cap for saved-moment lists and does not delete stored stories", () => {
    const route = readFileSync(path.resolve("src/app/api/yours/route.ts"), "utf8");
    const yours = readFileSync(path.resolve("src/components/YoursStory.tsx"), "utf8");
    const joy = readFileSync(path.resolve("src/components/JoyStudio.tsx"), "utf8");
    const vault = readFileSync(path.resolve("src/lib/vault.ts"), "utf8");

    expect(route).toMatch(/latestMoments\(stories, \{ excludeId: currentId \}\)/);
    expect(route).not.toMatch(/vault\.stories\s*=/);
    expect(yours).toMatch(/latestMoments\(state\.earlier, \{ excludeId: state\.story\.id \}\)/);
    expect(yours).not.toMatch(/show more/i);
    expect(joy).toMatch(/latestMoments\(/);
    expect(joy).toMatch(/id="saved-joy-moments-list"/);
    expect(joy).not.toMatch(/show more/i);
    expect(vault).toMatch(/return \[\.\.\.vault\.stories\]\.sort/);
    expect(vault).not.toMatch(/LATEST_MOMENTS_LIMIT/);
  });
});
