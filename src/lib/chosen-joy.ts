import { getJoyById } from "@/lib/landing";

const CHOSEN_JOY_KEY = "gooddaynight.chosenJoy";

type ChosenJoy = {
  day: string;
  joyId: string;
};

let memory: ChosenJoy | null = null;

function storage(): Storage | null {
  try {
    return typeof sessionStorage === "undefined" ? null : sessionStorage;
  } catch {
    return null;
  }
}

function readStored(): ChosenJoy | null {
  const raw = storage()?.getItem(CHOSEN_JOY_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as ChosenJoy;
    if (typeof parsed.day === "string" && typeof parsed.joyId === "string" && parsed.joyId) {
      return parsed;
    }
  } catch {
    return null;
  }
  return null;
}

function catalogJoyId(joyId: string | null | undefined): string | null {
  return getJoyById(joyId)?.id ?? null;
}

export function writeChosenJoy(day: string, joyId: string): void {
  const id = catalogJoyId(joyId);
  if (!id) return;
  memory = { day, joyId: id };
  try {
    storage()?.setItem(CHOSEN_JOY_KEY, JSON.stringify(memory));
  } catch {
    // Memory still covers this tab when storage is blocked.
  }
}

export function readChosenJoy(day: string): string | null {
  if (memory?.day === day) {
    const remembered = catalogJoyId(memory.joyId);
    if (remembered) return remembered;
    memory = null;
  }
  const stored = readStored();
  if (!stored || stored.day !== day) return null;
  const id = catalogJoyId(stored.joyId);
  if (!id) return null;
  memory = { day, joyId: id };
  return id;
}

export function resetChosenJoyForTests(): void {
  memory = null;
  try {
    storage()?.removeItem(CHOSEN_JOY_KEY);
  } catch {
    // Ignore storage failures in tests.
  }
}
