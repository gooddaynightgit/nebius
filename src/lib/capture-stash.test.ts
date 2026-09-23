import { afterEach, describe, expect, it } from "vitest";
import { captionDisposition } from "./app-capture";
import {
  buildAppCaptureForm,
  clearCaptureStash,
  clearCaptureStashIfOpened,
  clearPendingPhoto,
  isStashForDay,
  isYoursMissingPayload,
  readCaptureStash,
  readPendingPhoto,
  resetCaptureStashForTests,
  writePendingPhoto,
  shouldClearCaptureStash,
  stashDayKey,
  updateCaptureStashPhoto,
  writeCaptureStash,
} from "./capture-stash";
import { LANDING } from "./landing";

function jpegBlob(bytes = [0xff, 0xd8, 0xff, 0xd9]): Blob {
  return new Blob([new Uint8Array(bytes)], { type: "image/jpeg" });
}

function jpegFile(name = "moment.jpg"): File {
  return new File([jpegBlob()], name, { type: "image/jpeg", lastModified: 1_700_000_000_000 });
}

afterEach(() => {
  resetCaptureStashForTests();
});

describe("capture stash helpers", () => {
  it("keys a stash to the local calendar day and clears on rollover", () => {
    expect(stashDayKey("2026-09-21")).toBe("capture:2026-09-21");
    expect(
      shouldClearCaptureStash({ stashDay: "2026-09-21", today: "2026-09-21", yoursOpened: false }),
    ).toBe(false);
    expect(
      shouldClearCaptureStash({ stashDay: "2026-09-20", today: "2026-09-21", yoursOpened: false }),
    ).toBe(true);
    expect(
      shouldClearCaptureStash({ stashDay: "2026-09-21", today: "2026-09-21", yoursOpened: true }),
    ).toBe(true);
  });

  it("treats GET/POST missing bodies as the YOURS empty-vault case", () => {
    expect(isYoursMissingPayload(404, { code: "missing", error: LANDING.app.yoursMissing })).toBe(
      true,
    );
    expect(isYoursMissingPayload(400, { error: LANDING.app.yoursMissing })).toBe(true);
    expect(
      isYoursMissingPayload(404, {
        code: "expired",
        error: "Tonight's story lived for one night. Come back with today's photo.",
      }),
    ).toBe(false);
    expect(isYoursMissingPayload(403, { code: "blocked", error: LANDING.app.blocked })).toBe(false);
  });

  it("stores today's JPEG + joy and builds the CaptureStudio FormData shape", async () => {
    const photo = jpegFile("kettle.jpg");
    const saved = await writeCaptureStash({
      day: "2026-09-21",
      joyType: "morning-sunlight",
      caption: "the light on the kettle",
      photo,
    });
    expect(isStashForDay(saved, "2026-09-21")).toBe(true);
    expect(saved.photo).toBeInstanceOf(Blob);
    expect(saved.photo).not.toBe(photo);
    expect(saved.mimeType).toBe("image/jpeg");

    const read = await readCaptureStash("2026-09-21");
    expect(read?.joyType).toBe("morning-sunlight");
    expect(read?.caption).toBe("the light on the kettle");
    expect(read?.fileName).toBe("kettle.jpg");
    expect(await readCaptureStash("2026-09-22")).toBeNull();

    const again = await writeCaptureStash({
      day: "2026-09-21",
      joyType: "morning-sunlight",
      caption: "the light on the kettle",
      photo,
    });
    const form = buildAppCaptureForm(again, 420, "keep");
    expect(form.get("source")).toBe("app");
    expect(form.get("kind")).toBe("photo");
    expect(form.get("day")).toBe("2026-09-21");
    expect(form.get("joyType")).toBe("morning-sunlight");
    expect(form.get("tzOffset")).toBe("420");
    expect(form.get("caption")).toBe("the light on the kettle");
    expect(form.get("spellDecision")).toBe("keep");
    const file = form.get("file");
    expect(file).toBeInstanceOf(File);
    expect((file as File).name).toBe("kettle.jpg");
    expect((file as File).type).toBe("image/jpeg");
  });

  it("updates the photo when the user replaces it and clears after YOURS opens", async () => {
    await writeCaptureStash({
      day: "2026-09-21",
      joyType: "just-this",
      caption: "he wrote back",
      photo: jpegFile("first.jpg"),
    });
    const replaced = await updateCaptureStashPhoto("2026-09-21", jpegFile("second.jpg"));
    expect(replaced?.fileName).toBe("second.jpg");
    expect(replaced?.caption).toBe(captionDisposition("he wrote back").caption);
    expect(replaced?.joyType).toBe("just-this");

    await clearCaptureStashIfOpened("2026-09-21", true);
    expect(await readCaptureStash("2026-09-21")).toBeNull();

    await writeCaptureStash({
      day: "2026-09-21",
      joyType: "just-this",
      photo: jpegFile("again.jpg"),
    });
    await clearCaptureStash();
    expect(await readCaptureStash("2026-09-21")).toBeNull();
    expect(await updateCaptureStashPhoto("2026-09-21", jpegFile("nope.jpg"))).toBeNull();
  });

  it("keeps a photo waiting for the joy page without counting as a saved joy", async () => {
    const photo = jpegFile("porch.jpg");
    await writePendingPhoto("2026-09-21", photo);
    const pending = await readPendingPhoto("2026-09-21");
    expect(pending?.name).toBe("porch.jpg");
    expect(pending?.type).toBe("image/jpeg");
    expect(await readCaptureStash("2026-09-21")).toBeNull();
    expect(await readPendingPhoto("2026-09-22")).toBeNull();
    await clearPendingPhoto();
    expect(await readPendingPhoto("2026-09-21")).toBeNull();
  });
});
