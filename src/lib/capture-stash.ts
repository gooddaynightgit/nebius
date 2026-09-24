import { captionDisposition } from "./app-capture";
import { LANDING } from "./landing";
import { acceptPendingWrite } from "./moment";

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
  photoEmphasis?: "low";
  sparkAnswer?: "yes" | "no";
  /** Which story this phone copy belongs to. Missing on records saved before moment ids. */
  momentId?: string;
};

export type CaptureStashInput = {
  day: string;
  joyType: string;
  caption?: string;
  photo: Blob | File;
  fileName?: string;
  photoEmphasis?: "low";
  sparkAnswer?: "yes" | "no";
  momentId?: string;
};

type YoursMissingBody = {
  code?: string;
  error?: string;
};

let memoryStash: CaptureStash | null = null;
let memoryPending: PendingPhoto | null = null;

export const CAPTURE_PENDING_RECORD_KEY = "pending";

export type PendingPhoto = {
  day: string;
  fileName: string;
  mimeType: string;
  photo: Blob;
  momentId?: string;
  generation?: number;
};

let activeMomentId: string | null = null;
let activeGeneration = 0;
let failPendingDeletes = 0;

/** The next clear of the waiting photo fails once. Tests use this to prove a failed clear is not silent. */
export function failNextPendingDeleteForTests(): void {
  failPendingDeletes += 1;
}

export function beginMomentWrite(momentId: string): number {
  if (activeMomentId !== momentId) {
    activeMomentId = momentId;
    activeGeneration = 1;
  } else {
    activeGeneration += 1;
  }
  return activeGeneration;
}

export function currentMomentWrite(): { momentId: string | null; generation: number } {
  return { momentId: activeMomentId, generation: activeGeneration };
}

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
  stash: Pick<
    CaptureStash,
    "day" | "joyType" | "caption" | "photo" | "fileName" | "mimeType" | "sparkAnswer" | "photoEmphasis"
  >,
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
  if (stash.sparkAnswer) {
    form.set("sparkAnswer", stash.sparkAnswer);
    form.set("photoEmphasis", stash.photoEmphasis || "low");
  }
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
    ...(input.momentId ? { momentId: input.momentId } : {}),
    ...(input.sparkAnswer
      ? { sparkAnswer: input.sparkAnswer, photoEmphasis: "low" as const }
      : {}),
  };
  memoryStash = record;
  await writePersistedStash(record);
  return record;
}

export async function updateCaptureStashPhoto(
  day: string,
  photo: File,
  momentId?: string,
): Promise<CaptureStash | null> {
  const existing = await readCaptureStash(day);
  if (!existing) return null;
  if (momentId && existing.momentId && existing.momentId !== momentId) return null;
  return writeCaptureStash({
    day,
    joyType: existing.joyType,
    caption: "",
    photo,
    fileName: photo.name || existing.fileName,
    momentId: momentId || existing.momentId,
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

export async function writePendingPhoto(
  day: string,
  photo: File,
  meta?: { momentId: string; generation: number },
): Promise<PendingPhoto | null> {
  if (meta && !acceptPendingWrite({
    writeGeneration: meta.generation,
    currentGeneration: activeGeneration,
    writeMomentId: meta.momentId,
    activeMomentId,
  })) {
    return null;
  }
  const mimeType = photo.type || "image/jpeg";
  const fileName = photo.name || "moment.jpg";
  const bytes = await photo.arrayBuffer();
  if (meta && !acceptPendingWrite({
    writeGeneration: meta.generation,
    currentGeneration: activeGeneration,
    writeMomentId: meta.momentId,
    activeMomentId,
  })) {
    return null;
  }
  const record: PendingPhoto = {
    day,
    fileName,
    mimeType,
    photo: new Blob([bytes], { type: mimeType }),
    ...(meta ? { momentId: meta.momentId, generation: meta.generation } : {}),
  };
  memoryPending = record;
  await writePersistedRecord(CAPTURE_PENDING_RECORD_KEY, record);
  if (meta && !acceptPendingWrite({
    writeGeneration: meta.generation,
    currentGeneration: activeGeneration,
    writeMomentId: meta.momentId,
    activeMomentId,
  })) {
    if (memoryPending?.generation === meta.generation && memoryPending.momentId === meta.momentId) {
      memoryPending = null;
      await deletePersistedRecord(CAPTURE_PENDING_RECORD_KEY);
    }
    return null;
  }
  return record;
}

export async function readPendingMoment(
  day: string,
): Promise<{ file: File; momentId?: string } | null> {
  const cached = memoryPending?.day === day ? memoryPending : null;
  const record = cached ?? (await readPersistedPending());
  if (!record || record.day !== day || !(record.photo instanceof Blob) || record.photo.size === 0) {
    return null;
  }
  memoryPending = record;
  return {
    file: new File([record.photo], record.fileName || "moment.jpg", {
      type: record.mimeType || record.photo.type || "image/jpeg",
    }),
    momentId: record.momentId,
  };
}

export async function readPendingPhoto(day: string): Promise<File | null> {
  const pending = await readPendingMoment(day);
  return pending?.file ?? null;
}

export async function clearPendingPhoto(): Promise<void> {
  await deletePersistedRecordStrict(CAPTURE_PENDING_RECORD_KEY);
  const left = await readPersistedPending();
  if (left) throw new Error("Could not clear the waiting photo.");
  memoryPending = null;
}

export function resetCaptureStashForTests(): void {
  memoryStash = null;
  memoryPending = null;
  activeMomentId = null;
  activeGeneration = 0;
  failPendingDeletes = 0;
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
  await deletePersistedRecord(CAPTURE_STASH_RECORD_KEY);
}

async function readPersistedPending(): Promise<PendingPhoto | null> {
  const record = await readPersistedRecord(CAPTURE_PENDING_RECORD_KEY);
  return isPendingPhoto(record) ? record : null;
}

async function readPersistedRecord(key: string): Promise<unknown> {
  if (!idbAvailable()) return null;
  try {
    const db = await openStashDb();
    try {
      return await idbReq(
        db.transaction(CAPTURE_STASH_STORE, "readonly").objectStore(CAPTURE_STASH_STORE).get(key),
      );
    } finally {
      db.close();
    }
  } catch {
    return null;
  }
}

async function writePersistedRecord(key: string, record: unknown): Promise<void> {
  if (!idbAvailable()) return;
  try {
    const db = await openStashDb();
    try {
      await idbReq(
        db.transaction(CAPTURE_STASH_STORE, "readwrite").objectStore(CAPTURE_STASH_STORE).put(
          record,
          key,
        ),
      );
    } finally {
      db.close();
    }
  } catch {
    // Memory still covers same-tab navigation when IndexedDB is unavailable.
  }
}

async function deletePersistedRecord(key: string): Promise<void> {
  try {
    await deletePersistedRecordStrict(key);
  } catch {
    // Stash clears can fail soft. Pending clears use the strict path.
  }
}

async function deletePersistedRecordStrict(key: string): Promise<void> {
  if (key === CAPTURE_PENDING_RECORD_KEY && failPendingDeletes > 0) {
    failPendingDeletes -= 1;
    throw new Error("Could not clear the waiting photo.");
  }
  if (!idbAvailable()) return;
  const db = await openStashDb();
  try {
    await idbReq(
      db.transaction(CAPTURE_STASH_STORE, "readwrite").objectStore(CAPTURE_STASH_STORE).delete(key),
    );
  } finally {
    db.close();
  }
}

function isPendingPhoto(value: unknown): value is PendingPhoto {
  if (!value || typeof value !== "object") return false;
  const record = value as PendingPhoto;
  return (
    typeof record.day === "string" &&
    typeof record.fileName === "string" &&
    record.photo instanceof Blob
  );
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
