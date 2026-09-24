import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  destinationForEntitlement,
  destinationForGame,
  photoButtonsEnabled,
  releaseCaptureVisit,
  uploadPhotoDestination,
} from "./photo-entry";

describe("upload photo after a joy pick", () => {
  it("reads goodfans game as the credit check: above zero captures, otherwise buys", () => {
    expect(destinationForGame(1)).toBe("/app");
    expect(destinationForGame(40)).toBe("/app");
    expect(destinationForGame(0)).toBe("/moments");
    expect(destinationForGame(-1)).toBe("/moments");

    const entitlement = readFileSync(path.resolve("src/lib/entitlement.ts"), "utf8");
    const route = readFileSync(path.resolve("src/app/api/payfast/entitlement/route.ts"), "utf8");
    expect(entitlement).toMatch(/goodfans/);
    expect(entitlement).toMatch(/remaining: row\.game/);
    expect(route).toMatch(/getEntitlement/);
    expect(route).toMatch(/remaining/);
  });

  it("sends a signed-out buyer to the existing email OTP page", () => {
    expect(uploadPhotoDestination(false, 0)).toBe("/app");
    expect(uploadPhotoDestination(false, 40)).toBe("/app");
    expect(uploadPhotoDestination(true, null)).toBe("/app");
    expect(uploadPhotoDestination(true, 2)).toBe("/app");
    expect(uploadPhotoDestination(true, 0)).toBe("/moments");
  });

  it("keeps photo buttons open after a story when credit remains, and buys at zero", () => {
    expect(photoButtonsEnabled(true, 39)).toBe(true);
    expect(photoButtonsEnabled(true, 1)).toBe(true);
    expect(photoButtonsEnabled(true, 0)).toBe(false);
    expect(photoButtonsEnabled(false, 39)).toBe(false);
    expect(releaseCaptureVisit(true)).toEqual({ busy: false, startNewMoment: true });
    expect(releaseCaptureVisit(false)).toEqual({ busy: false, startNewMoment: false });
    expect(uploadPhotoDestination(true, 0)).toBe("/moments");
  });

  it("leaves the photo page for the buy page when the verified balance is empty", () => {
    expect(destinationForEntitlement("open")).toBe("/app");
    expect(destinationForEntitlement("closed")).toBe("/moments");
    expect(destinationForEntitlement("exhausted")).toBe("/moments");
    expect(destinationForEntitlement("error")).toBeNull();
  });
});
