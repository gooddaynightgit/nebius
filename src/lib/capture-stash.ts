import { captionDisposition } from "./app-capture";
import { LANDING } from "./landing";

export const CAPTURE_STASH_DB = "gooddaynight";
export const CAPTURE_STASH_STORE = "captures";
export const CAPTURE_STASH_RECORD_KEY = "today";

export type CaptureStash = {
  day: string;
  joyType: string;
  caption: string;
  fileName: string;
  mimeType: string;
  photo: Blob;
  savedAt: number;
};

export type CaptureStashInput = {
  day: string;
  joyType: string;
  caption?: string;
  photo: Blob | File;
  fileName?: string;
};

type YoursMissingBody = {
  code?: string;
  error?: string;
};

let memoryStash: CaptureStash | null = null;

export function stashDayKey(day: string): string {
  return `capture:${day}`;
}

export function isStashForDay(stash: CaptureStash | null | undefined, day: string): boolean {
  return Boolean(stash && stash.day === day && stash.photo && stash.joyType);
}

export function shouldClearCaptureStash(input: {
  stashDay: string;
  today: string;
  yoursOpened?: boolean;
}): boolean {
  if (input.yoursOpened) return true;
  return input.stashDay !== input.today;
}

export function isYoursMissingPayload(
  status: number,
  data: YoursMissingBody | null | undefined,
): boolean {
  if (!data) return false;
  if (data.code === "missing") return true;
  if (data.code === "expired") return false;
  if (status !== 400 && status !== 404) return false;
  return data.error === LANDING.app.yoursMissing;
}

export function stashPhotoFile(stash: Pick<CaptureStash, "photo" | "fileName" | "mimeType">): File {
  if (stash.photo instanceof File && stash.photo.size > 0) {
    return stash.photo;
  }
  return new File([stash.photo], stash.fileName || "moment.jpg", {
    type: stash.mimeType || stash.photo.type || "image/jpeg",
  });
}

export function buildAppCaptureForm(
  stash: Pick<CaptureStash, "day" | "joyType" | "caption" | "photo" | "fileName" | "mimeType">,
  tzOffsetMinutes = new Date().getTimezoneOffset(),
  spellDecision?: string,
): FormData {
  const form = new FormData();
  form.set("source", "app");
  form.set("kind", "photo");
  form.set("day", stash.day);
  form.set("joyType", stash.joyType);
  form.set("tzOffset", String(tzOffsetMinutes));
  if (spellDecision) form.set("spellDecision", spellDecision);
  const caption = captionDisposition(stash.caption).caption;
  if (caption) form.set("caption", caption);
  const file = stashPhotoFile(stash);
  form.set("file", file, file.name || "moment.jpg");
  return form;
}

export async function readCaptureStash(day: string): Promise<CaptureStash | null> {
  if (memoryStash) {
    if (shouldClearCaptureStash({ stashDay: memoryStash.day, today: day })) {
      await clearCaptureStash();
      return null;
    }
    if (isStashForDay(memoryStash, day)) return memoryStash;
  }
  const persisted = await readPersistedStash();
  if (!persisted) return null;
  if (shouldClearCaptureStash({ stashDay: persisted.day, today: day })) {
    await clearCaptureStash();
    return null;
  }
  memoryStash = persisted;
  return persisted;
}

export async function writeCaptureStash(input: CaptureStashInput): Promise<CaptureStash> {
  const mimeType = input.photo.type || "image/jpeg";
  const fileName =
    (input.photo instanceof File && input.photo.name) || input.fileName || "moment.jpg";
  const bytes = await input.photo.arrayBuffer();
  const record: CaptureStash = {
    day: input.day,
    joyType: input.joyType,
    caption: captionDisposition(input.caption ?? "").caption,
    fileName,
    mimeType,
    photo: new Blob([bytes], { type: mimeType }),
    savedAt: Date.now(),
  };
  memoryStash = record;
  await writePersistedStash(record);
  return record;
}

export async function updateCaptureStashPhoto(day: string, photo: File): Promise<CaptureStash | null> {
  const existing = await readCaptureStash(day);
  if (!existing) return null;
  return writeCaptureStash({
    day,
    joyType: existing.joyType,
    caption: existing.caption,
    photo,
    fileName: photo.name || existing.fileName,
  });
}

export async function clearCaptureStash(): Promise<void> {
  memoryStash = null;
  await clearPersistedStash();
}

export async function clearCaptureStashIfOpened(day: string, yoursOpened: boolean): Promise<void> {
  if (!yoursOpened) return;
  const existing = memoryStash ?? (await readPersistedStash());
  if (!existing || existing.day !== day) {
    if (existing) await clearCaptureStash();
    return;
  }
  await clearCaptureStash();
}

export function resetCaptureStashForTests(): void {
  memoryStash = null;
}

function idbAvailable(): boolean {
  return typeof indexedDB !== "undefined";
}

function openStashDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(CAPTURE_STASH_DB, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(CAPTURE_STASH_STORE)) {
        db.createObjectStore(CAPTURE_STASH_STORE);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Could not open capture stash."));
  });
}

function idbReq<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Capture stash failed."));
  });
}

async function readPersistedStash(): Promise<CaptureStash | null> {
  if (!idbAvailable()) return null;
  try {
    const db = await openStashDb();
    try {
      const record = await idbReq(
        db.transaction(CAPTURE_STASH_STORE, "readonly").objectStore(CAPTURE_STASH_STORE).get(
          CAPTURE_STASH_RECORD_KEY,
        ),
      );
      return isCaptureStash(record) ? record : null;
    } finally {
      db.close();
    }
  } catch {
    return null;
  }
}

async function writePersistedStash(record: CaptureStash): Promise<void> {
  if (!idbAvailable()) return;
  try {
    const db = await openStashDb();
    try {
      await idbReq(
        db.transaction(CAPTURE_STASH_STORE, "readwrite").objectStore(CAPTURE_STASH_STORE).put(
          record,
          CAPTURE_STASH_RECORD_KEY,
        ),
      );
    } finally {
      db.close();
    }
  } catch {
    // Memory stash still covers same-tab navigation on ephemeral demos.
  }
}

async function clearPersistedStash(): Promise<void> {
  if (!idbAvailable()) return;
  try {
    const db = await openStashDb();
    try {
      await idbReq(
        db.transaction(CAPTURE_STASH_STORE, "readwrite").objectStore(CAPTURE_STASH_STORE).delete(
          CAPTURE_STASH_RECORD_KEY,
        ),
      );
    } finally {
      db.close();
    }
  } catch {
    // Ignore persistence failures; memory is already cleared.
  }
}

function isCaptureStash(value: unknown): value is CaptureStash {
  if (!value || typeof value !== "object") return false;
  const record = value as CaptureStash;
  return (
    typeof record.day === "string" &&
    typeof record.joyType === "string" &&
    typeof record.fileName === "string" &&
    record.photo instanceof Blob
  );
}
