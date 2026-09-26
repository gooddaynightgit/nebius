import { getJoyById } from "./landing";

/** Caption under a finished story, and the last dot on the bar. */
export const JOURNEY_FINISHED_CAPTION = "My good moment weaved";

export const JOURNEY_STEPS = [
  { label: "Weave your good moment" },
  { label: "Pick your joy" },
  { label: "Unlock your good moments" },
  { label: "Capture it" },
  { label: "What is the good in this moment?" },
  { label: "Weave my good moment" },
  { label: JOURNEY_FINISHED_CAPTION },
] as const;

export const JOURNEY_STEP_COUNT = JOURNEY_STEPS.length;

/** Same words as the bar, for the step buttons. */
export const STEP_LABEL = {
  start: JOURNEY_STEPS[0].label,
  joy: JOURNEY_STEPS[1].label,
  unlock: JOURNEY_STEPS[2].label,
  photo: JOURNEY_STEPS[3].label,
  good: JOURNEY_STEPS[4].label,
  turn: JOURNEY_STEPS[5].label,
} as const;

/** Where the photo page is within its steps, after Unlock. `weaved` is the finished story. */
export type AppProgress = "upload" | "good" | "turn" | "weaved";

export type BuyerGate = "unknown" | "locked" | "open";

type SearchParamsLike = { get(name: string): string | null };

export function normalizeJourneyPath(pathname: string): string {
  if (!pathname) return "/";
  if (pathname.length > 1 && pathname.endsWith("/")) return pathname.slice(0, -1);
  return pathname;
}

/**
 * 1-based step for the shared progress bar, or null when the route is not part of the flow.
 * On `/app`, Unlock stays current until the buyer gate is open, except a PayFast return
 * (`paid=1`) which is already the photo step. After that, the photo page moves to the
 * good-in-this-moment question, then to Weave my good moment while the story is weaving.
 * The last dot stays empty until `/app/yours` is showing a woven story.
 * `/signin` is the same Unlock step: email only, before the price.
 * Cancelled checkout stays on `/moments`.
 */
export function journeyStep(
  pathname: string,
  search: SearchParamsLike,
  gate: BuyerGate,
  appProgress: AppProgress = "upload",
): number | null {
  const path = normalizeJourneyPath(pathname);
  if (path === "/") return 1;
  if (path === "/app/joy") return 2;
  if (path === "/moments" || path === "/signin") return 3;
  if (path === "/app/yours") {
    return appProgress === "weaved" ? JOURNEY_STEP_COUNT + 1 : 6;
  }
  if (path === "/app") {
    const onPhoto = search.get("paid") === "1" || gate === "open";
    if (!onPhoto) return 3;
    if (appProgress === "turn") return 6;
    if (appProgress === "good") return 5;
    return 4;
  }
  return null;
}

export function journeyFillPercent(step: number): number {
  if (step <= 1) return 0;
  const span = JOURNEY_STEP_COUNT - 1;
  return ((Math.min(step, JOURNEY_STEP_COUNT) - 1) / span) * 100;
}

/**
 * Page for each 1-based step. Unlock opens the price screen; a signed-out visit
 * is sent on to email sign-in by that page. Capture, the good question, and the
 * weave button share `/app` and only change which part is on screen.
 */
const JOURNEY_STEP_HREFS = [
  "/",
  "/app/joy",
  "/moments",
  "/app?review=capture",
  "/app?review=good",
  "/app?review=weave",
  "/app/yours",
] as const;

export function journeyBackHref(stepNumber: number): string | null {
  if (stepNumber < 1 || stepNumber > JOURNEY_STEPS.length) return null;
  return JOURNEY_STEP_HREFS[stepNumber - 1] ?? null;
}

export type JourneyDotKind = "done" | "current" | "future";

/** A finished story reports step 8, past the last dot. */
export function journeyDotKind(number: number, viewing: number, reached: number): JourneyDotKind {
  const far = Math.max(1, viewing, reached);
  if (viewing >= 1 && viewing <= JOURNEY_STEP_COUNT && number === viewing) return "current";
  if (number < far) return "done";
  return "future";
}

export function journeyClickableSteps(viewing: number, reached: number): number[] {
  const steps: number[] = [];
  for (let number = 1; number <= JOURNEY_STEP_COUNT; number += 1) {
    if (journeyDotKind(number, viewing, reached) === "done") steps.push(number);
  }
  return steps;
}

export const JOURNEY_REACHED_KEY = "gooddaynight.journeyReached";

export function readJourneyReached(): number {
  try {
    const raw = sessionStorage.getItem(JOURNEY_REACHED_KEY);
    const n = Number(raw);
    if (!Number.isFinite(n) || n < 1) return 1;
    return Math.min(Math.floor(n), JOURNEY_STEP_COUNT + 1);
  } catch {
    return 1;
  }
}

export function rememberJourneyReached(step: number): number {
  const next = Math.max(readJourneyReached(), Math.max(1, step));
  try {
    sessionStorage.setItem(JOURNEY_REACHED_KEY, String(next));
  } catch {
    /* private mode */
  }
  return next;
}

export type JourneyKeptState = {
  joyId: string | null;
  credits: number;
  photoId: string | null;
  caption: string;
  storyId: string | null;
};

/** Going back is a link. It does not charge, clear, or replace the saved moment. */
export function journeyStateAfterBack(
  stepNumber: number,
  state: JourneyKeptState,
): { href: string | null; state: JourneyKeptState; charged: false; reset: false } {
  return {
    href: journeyBackHref(stepNumber),
    state: { ...state },
    charged: false,
    reset: false,
  };
}

export type ReviewCaptureInput = {
  review: string | null;
  busy: boolean;
  questionOpen: boolean;
  hasPhoto: boolean;
  hasCaption: boolean;
};

export type ReviewCaptureView = {
  progress: AppProgress;
  showQuestion: boolean;
  showWeave: boolean;
  charged: false;
  reset: false;
};

/**
 * Which part of the photo page to show when a completed step is opened again.
 * Missing photo or description falls back to the capture step. Nothing is cleared.
 */
export function reviewCaptureView(input: ReviewCaptureInput): ReviewCaptureView {
  const natural: AppProgress = input.busy ? "turn" : input.questionOpen ? "good" : "upload";
  const kept = { charged: false as const, reset: false as const };
  if (input.review === "capture") {
    return {
      progress: "upload",
      showQuestion: input.hasCaption,
      showWeave: false,
      ...kept,
    };
  }
  if (input.review === "good") {
    if (input.questionOpen || input.hasCaption) {
      return { progress: "good", showQuestion: true, showWeave: false, ...kept };
    }
    return { progress: "upload", showQuestion: false, showWeave: false, ...kept };
  }
  if (input.review === "weave") {
    if (input.busy) return { progress: "turn", showQuestion: input.questionOpen, showWeave: false, ...kept };
    if (input.questionOpen || input.hasCaption) {
      return { progress: "turn", showQuestion: true, showWeave: true, ...kept };
    }
    return { progress: "upload", showQuestion: false, showWeave: false, ...kept };
  }
  return {
    progress: natural,
    showQuestion: input.questionOpen,
    showWeave: input.questionOpen,
    ...kept,
  };
}

/** Joy already chosen, or the joy saved with the photo, so a return visit stays selected. */
export function restoredJoyId(
  chosenJoyId: string | null | undefined,
  stashJoyId: string | null | undefined,
  photoJoyId: string | null | undefined,
): string | null {
  for (const id of [chosenJoyId, stashJoyId, photoJoyId]) {
    const joy = getJoyById(id);
    if (joy) return joy.id;
  }
  return null;
}

/** Description already written. A blank field must not replace it. */
export function restoredMomentText(input: {
  currentCaption: string;
  stashCaption?: string | null;
  photoCaption?: string | null;
}): string {
  if (input.currentCaption.trim()) return input.currentCaption;
  const stash = input.stashCaption?.trim() ?? "";
  if (stash) return stash;
  return input.photoCaption?.trim() ?? "";
}
