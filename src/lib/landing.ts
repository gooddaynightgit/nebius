export type JoyType = {
  id: string;
  title: string;
  tagline: string;
  body: string;
  capture: string;
  playbackTemplate: string;
};

export const LANDING = {
  hero: {
    h1: "You scrolled past a hundred good moments today. None of them were yours.",
    subheadline:
      "Your laugh. Your small win. Your quiet moment. Nobody turned them into anything — not even you. Gooddaynight does →",
    cta: "Hear your story — free",
    microcopy: [
      "Snap one good moment from your day. Gooddaynight reads it back to you as a beautiful story — your own.",
      "One good moment remembered today. More spotted tomorrow. Day by day, one unfolds in multifolds.",
    ],
  },
  moment: {
    title: "One good moment today",
    pictureTitle: "Lay the picture here.",
    photoLines: [
      "Drop the still that held the day.",
      "A sky. A gift. A hello on the screen.",
      "One frame is enough.",
    ],
    photoPs:
      "ps: a screenshot of three things you're grateful for — handwritten ones especially welcome — your joy, already multiplying.",
    whisperLabel: "A whisper next to the photo. 80 characters.",
    whisperExamples: "the light on the kettle / he wrote back / I made it home",
    joyLegend: "What kind of quiet joy was it? (pick one)",
    playbackExample:
      "Example of tonight’s tone — not your story yet. YOURS writes yours from this photo.",
  },
  app: {
    photoHelp:
      "A sky. A gift. A hello on the screen. A screenshot of 3 things you're grateful for — handwritten ones especially welcome ...",
    yours: "YOURS",
    brand: "gooddaynight.com",
    tagline: "One photo. One joy. One story.",
    yoursHint: "YOURS — the link that opens tonight’s story.",
    captionLabel: "Optional caption",
    captionHelp: "Write what the picture cannot say: a name, a step count, “he wrote back.”",
    captionExamples: "a name / a step count / he wrote back",
    captionDropped: "That line couldn’t be saved. The photo still is.",
    blocked: "Tonight isn’t a YOURS story. This picture isn’t one we can tell. Keep the night gentle.",
    keep: "Keep",
    keepLabel: "Keep tonight’s story with the photo",
    keepBusy: "Keeping…",
    keepFailed: "Couldn’t keep tonight’s story. Try again.",
    save: "Save today’s moment",
    replace: "Replace today’s photo",
    takePhoto: "Take your photo",
    uploadPhoto: "Upload your photo",
    keepStill: "Keep this still",
    cancelCamera: "Cancel",
    reach: "Couldn't reach Gooddaynight — if you're on the preview link, refresh and sign into Vercel again, then retry.",
    reachLive: "Couldn't reach Gooddaynight — check your connection and try again.",
    unexpected: "Couldn't read Gooddaynight's reply. Refresh and try again.",
    tryAgain: "Try again",
    joyNeed: "Pick the kind of quiet joy first.",
    tooLarge: "That photo is too large — try again after we shrink it",
    tooLargeKeep: "Keep photos under 4.5 MB.",
    heicAsk: "That photo format isn't supported here. Save it as JPEG or PNG and try again.",
    yoursMissing: "Save today's photo and pick a joy first.",
    keepingMoment: "Keeping your moment…",
    savedOnPhone: "Saved on this phone — open YOURS from here",
    resaveFailed: "We couldn't send today's photo again. Go back and save it from this phone.",
  },
  footer: {
    changePicture: "You can change the picture if the day gets kinder.",
    oneMoment: "One moment. One story.",
    somethingGood: "Something good is about to happen!",
    site: "Gooddaynight.com",
    lookingForward: "Looking forward to hearing from you:",
    hello: "hello@gooddaynight.com",
  },
} as const;

export const JOY_TYPES: JoyType[] = [
  {
    id: "morning-sunlight",
    title: "Morning sunlight",
    tagline: "You stepped into the early gold and let the day find you.",
    body: "Step into the early light. On the porch. By a window. Along your street. Let it find your face — it resets your body's clock and lifts your serotonin before the day even begins. Gold on your skin. A rhythm waking inside you. This is how a good day starts: gently, with you in it.",
    capture:
      "a photo of the light on your table, the sky on your street, your shadow stretched long on the pavement.",
    playbackTemplate:
      '"This morning, you stood in the sun. Ten quiet minutes. Gold on your skin. Your body remembered its rhythm. And the day began — gently, breathtakingly, beautifully — with you in it."',
  },
  {
    id: "a-small-hello",
    title: "A small hello",
    tagline: "Someone was reached. A wave, a laugh, a blue bubble.",
    body: "A roaring laugh with a coworker. A huge wave to your neighbor across the street. A text to a friend that says *you crossed my mind and it made me grin.* Each one floods you with oxytocin — the chemistry of pure belonging — and the whole world lights up like it's in on the joy with you.",
    capture:
      "a photo of the two of you mid-laugh, their name on your screen, your hand still raised in that wave.",
    playbackTemplate:
      '"Today, you laughed so hard the room got brighter. You waved like you meant it — and it came right back at you. Somewhere, someone is smiling right now because you exist. That\'s not a small thing. That\'s everything."',
  },
  {
    id: "one-thing-done-slowly",
    title: "One thing, done slowly",
    tagline: "Coffee. A page. Dirt on your hands. The phone stayed down.",
    body: "The coffee pours like liquid gold — and you watch every drop like it matters, because it does. Your hands in the garden soil, the earth humming beneath your fingers. A chapter so good the whole world falls away. Phone forgotten. Every sense awake. Every second golden. This is being gloriously, completely alive.",
    capture: "a photo of the steam rising, the soil on your palms, the open book on your knee.",
    playbackTemplate:
      '"Today, you gave one moment everything — and it gave you back the whole world. Every sense on fire. Every second shining. You weren\'t just doing something today. You were THERE — fully, radiantly, joyfully there."',
  },
  {
    id: "a-little-movement",
    title: "A little movement",
    tagline: "Your body remembered it was yours. A walk. A stretch. Your dance.",
    body: "Ten minutes and your whole chemistry changes. A walk brisk enough to feel your heart sing. A stretch long and luxurious, spine waking, shoulders opening. Endorphins flood through you — your body's own joy, made by you, for you, on demand. You are powerful and it feels incredible.",
    capture:
      "a photo of your shoes on the pavement, your arms reaching wide to the sky, the path stretching out ahead of you.",
    playbackTemplate:
      '"Today, you moved — and your body threw a celebration. Endorphins like fireworks, mood soaring, heart singing. You didn\'t just go for a walk today. You turned yourself ON."',
  },
  {
    id: "one-corner-clear",
    title: "One corner, clear",
    tagline: "A small space breathed. That was the peace.",
    body: "One desk. One kitchen counter. One little square of the world, wiped clean and set right. Your hands move, the clutter disappears, and calm rises up to meet you — instant, visible, glorious accomplishment. A tiny island of order, built by you, shining back at you.",
    capture:
      "a photo of the cleared surface gleaming, your hands mid-tidy, the before-and-after smile on your face.",
    playbackTemplate:
      '"Today, you made order out of chaos — one beautiful corner at a time. You looked at what you built and felt that deep, golden calm: I did this. Your space is brighter. And so are you."',
  },
  {
    id: "just-this",
    title: "Just this",
    tagline: "You don't have to name the category. The photo already knows.",
    body: "Some joys refuse categories — and they're often the best ones. The unexpected. The unrepeatable. The moment you almost didn't capture. It counts. It always counts. Whatever it was, it found you today, and you were wise enough to keep it.",
    capture: "exactly as it happened. No explanation required.",
    playbackTemplate:
      '"Today held something that doesn\'t fit in any box — and it was yours. You noticed it. You kept it. Some moments are too alive for categories, and tonight, this one is yours to relive, word by word."',
  },
];

export const WHISPER_MAX = 80;
export const PHOTO_MAX_BYTES = Math.floor(4.5 * 1024 * 1024);

export function getJoyById(id: string | null | undefined): JoyType | undefined {
  if (!id) return undefined;
  return JOY_TYPES.find((joy) => joy.id === id);
}
