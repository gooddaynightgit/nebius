import { describe, expect, it } from "vitest";
import { journeyStep } from "./journey";
import {
  acceptPendingWrite,
  shouldRestorePending,
  startNewStoryDestination,
} from "./moment";

const noQuery = { get: () => null };

describe("pending photo versus the saved moment", () => {
  it("does not restore a leftover pending photo while a saved moment exists", () => {
    expect(
      shouldRestorePending({
        hasSavedMoment: true,
        hasPending: true,
        pendingMomentId: "mom_checkers000000001",
        activeMomentId: null,
      }),
    ).toBe(false);
    expect(
      shouldRestorePending({
        hasSavedMoment: true,
        hasPending: true,
        pendingMomentId: null,
        activeMomentId: null,
      }),
    ).toBe(false);
  });

  it("restores only the draft the buyer just started", () => {
    expect(
      shouldRestorePending({
        hasSavedMoment: true,
        hasPending: true,
        pendingMomentId: "mom_cars000000000001",
        activeMomentId: "mom_cars000000000001",
      }),
    ).toBe(true);
  });
});

describe("late photo writes", () => {
  it("rejects a write from an earlier pick", () => {
    expect(
      acceptPendingWrite({
        writeGeneration: 1,
        currentGeneration: 1,
        writeMomentId: "mom_older00000000001",
        activeMomentId: "mom_newer00000000001",
      }),
    ).toBe(false);
    expect(
      acceptPendingWrite({
        writeGeneration: 2,
        currentGeneration: 2,
        writeMomentId: "mom_newer00000000001",
        activeMomentId: "mom_newer00000000001",
      }),
    ).toBe(true);
  });
});

describe("start a new story with no credits", () => {
  it("sends the buyer to Unlock", () => {
    expect(startNewStoryDestination("exhausted")).toBe("/moments");
    expect(startNewStoryDestination("open")).toBeNull();
    expect(journeyStep("/app", noQuery, "locked")).toBe(3);
    expect(journeyStep("/moments", noQuery, "locked")).toBe(3);
    expect(journeyStep("/app", noQuery, "open")).toBe(4);
  });
});
