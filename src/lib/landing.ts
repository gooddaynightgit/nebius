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
      "Your laugh. Your small win. Your quiet moment. Nobody turned them into anything — not even you.",
    cta: "Hear your story — free",
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
    joyLegend: "(pick one)",
    playbackTitle: "Create your story",
    playbackExample:
      "Example of tonight’s tone — not your story yet. Create your story from this photo.",
  },
  app: {
    heading: "Today.",
    noticingTitle: "Moments worth noticing:",
    noticing: [
      "The first sip of coffee, still quiet",
      "Sunlight through a window you walk past every day",
      "A laugh that surprised you",
      "Your dog losing its mind when you got home",
      "A stranger holding the door",
      "The song that found you at the right time",
      "Rain on the roof while you’re warm inside",
      "A text from someone you miss",
      "Finishing something you kept putting off",
      "The exact second the sky turned gold",
      "Your kid saying something unintentionally wise",
      "A meal you actually tasted",
      "Someone laughing at your joke",
      "The walk where your head finally went quiet",
      "Clean sheets",
      "A small win nobody clapped for",
      "The drive home with the windows down",
      "Being forgiven",
      "Nothing happening — and it feeling like peace",
    ],
    photoHelp:
      "A sky. A gift. A hello on the screen. A screenshot of 3 things you're grateful for — handwritten ones especially welcome ...",
    yours: "My good moment weaved",
    playbackLead: "Here's how a good moment reads once it's weaved.",
    brand: "GoodDayNight",
    captionLabel: "What is the good in this moment?",
    sparkWait: "Let me see your good moment capture",
    sparkYes: "Yes",
    sparkNo: "No",
    captionHelp: "Write what the picture cannot say: a name, a step count, “he wrote back.”",
    captionExamples: "a name / a step count / he wrote back",
    captionDropped: "That line couldn’t be saved. The photo still is.",
    blocked: "Tonight isn’t a story we can create. This picture isn’t one we can tell. Keep the night gentle.",
    playMoment: "Play this good moment",
    pause: "Pause",
    keep: "Share",
    keepLabel: "Share tonight’s story with the photo",
    keepBusy: "Sharing…",
    keepFailed: "Couldn’t keep tonight’s story. Try again.",
    save: "Save today’s moment",
    replace: "Replace today’s photo",
    takePhoto: "Take your photo",
    uploadPhoto: "Upload your photo",
    keepStill: "Keep this still",
    cancelCamera: "Cancel",
    reach: "Couldn't reach GoodDayNight — if you're on the preview link, refresh and sign into Vercel again, then retry.",
    reachLive: "Couldn't reach GoodDayNight — check your connection and try again.",
    unexpected: "Couldn't read GoodDayNight's reply. Refresh and try again.",
    tryAgain: "Try again",
    joyNeed: "Pick the kind of quiet joy first.",
    joyQuestion: "What joy is it?",
    joyPickHint: "(pick one to Create your story)",
    alreadyPickedLink: "See your Created story",
    alreadyPickedEmpty: "Nothing saved yet. Pick a new one.",
    nextJoy: "Pick the quiet joy",
    photoNeed: "Add one photo from today.",
    witnessQuiet: "The witness didn’t look. The caption is still yours.",
    tooLarge: "That photo is too large — try again after we shrink it",
    tooLargeKeep: "Keep photos under 4.5 MB.",
    heicAsk: "That photo format isn't supported here. Save it as JPEG or PNG and try again.",
    yoursMissing: "Save today's photo and pick a joy first.",
    keepingMoment: "Keeping your moment…",
    savedOnPhone: "Saved on this phone — open Create your story from here",
    resaveFailed: "We couldn't send today's photo again. Go back and save it from this phone.",
  },
  footer: {
    changePicture: "You can change the picture if the day gets kinder.",
    oneMoment: "One moment. One story.",
    somethingGood: "Something good is about to happen!",
    site: "gooddaynight.com",
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
      '"This morning, I stood in the sun. Ten quiet minutes. Gold on my skin. My body remembered its rhythm. And the day began — gently, breathtakingly, beautifully — with me in it."',
  },
  {
    id: "a-small-hello",
    title: "A hello",
    tagline: "Someone was reached. A wave, a laugh, a blue bubble.",
    body: "A roaring laugh with a coworker. A huge wave to your neighbor across the street. A text to a friend that says *you crossed my mind and it made me grin.* Each one floods you with oxytocin — the chemistry of pure belonging — and the whole world lights up like it's in on the joy with you.",
    capture:
      "a photo of the two of you mid-laugh, their name on your screen, your hand still raised in that wave.",
    playbackTemplate:
      '"Today, I laughed so hard the room got brighter. I waved like I meant it — and it came right back at me. Somewhere, someone is smiling right now because I exist. That\'s not a small thing. That\'s everything."',
  },
  {
    id: "one-thing-done-slowly",
    title: "One thing, done slowly",
    tagline: "Coffee. A page. Dirt on your hands. The phone stayed down.",
    body: "The coffee pours like liquid gold — and you watch every drop like it matters, because it does. Your hands in the garden soil, the earth humming beneath your fingers. A chapter so good the whole world falls away. Phone forgotten. Every sense awake. Every second golden. This is being gloriously, completely alive.",
    capture: "a photo of the steam rising, the soil on your palms, the open book on your knee.",
    playbackTemplate:
      '"Today, I gave one moment everything — and it gave me back the whole world. Every sense on fire. Every second shining. I wasn\'t just doing something today. I was THERE — fully, radiantly, joyfully there."',
  },
  {
    id: "a-little-movement",
    title: "A little movement",
    tagline: "Your body remembered it was yours. A walk. A stretch. The long way home.",
    body: "Ten minutes and your whole chemistry changes. A walk brisk enough to feel your heart sing. A stretch long and luxurious, spine waking, shoulders opening. Endorphins flood through you — your body's own joy, made by you, for you, on demand. You are powerful and it feels incredible.",
    capture:
      "a photo of your shoes on the pavement, your arms reaching wide to the sky, the path stretching out ahead of you.",
    playbackTemplate:
      '"Today, I moved — and my body threw a celebration. Endorphins like fireworks, mood soaring, heart singing. I didn\'t just go for a walk today. I turned myself ON."',
  },
  {
    id: "one-corner-clear",
    title: "One corner, clear",
    tagline: "A small space breathed. That was the peace.",
    body: "One desk. One kitchen counter. One little square of the world, wiped clean and set right. Your hands move, the clutter disappears, and calm rises up to meet you — instant, visible, glorious accomplishment. A tiny island of order, built by you, shining back at you.",
    capture:
      "a photo of the cleared surface gleaming, your hands mid-tidy, the before-and-after smile on your face.",
    playbackTemplate:
      '"Today, I made order out of chaos — one beautiful corner at a time. I looked at what I built and felt that deep, golden calm: I did this. My space is brighter. And so am I."',
  },
  {
    id: "just-this",
    title: "Just this",
    tagline: "You don't have to name the category. The photo already knows.",
    body: "Some joys refuse categories — and they're often the best ones. The unexpected. The unrepeatable. The moment you almost didn't capture. It counts. It always counts. Whatever it was, it found you today, and you were wise enough to keep it.",
    capture: "exactly as it happened. No explanation required.",
    playbackTemplate:
      '"Today held something that doesn\'t fit in any box — and it was mine. I noticed it. I kept it. Some moments are too alive for categories, and tonight, this one is mine to relive, word by word."',
  },
  {
    id: "a-sound-you-stopped-for",
    title: "A sound you stopped for",
    tagline: "A laugh, a bird, a song in the next room. You stayed for it.",
    body: "Somewhere in the day a sound asked you to pause. A kettle starting. A voice you know. Rain, or a song you didn't plan to hear. You stopped, and the pause was the moment.",
    capture: "a photo of whatever made the sound — the kettle, the street, the open window.",
    playbackTemplate:
      '"Today, a sound found me and I let it. I stopped. The day got quieter and closer, and I was in it."',
  },
  {
    id: "someone-elses-good-moment",
    title: "Someone else's good moment",
    tagline: "Their joy crossed your day, and you kept a little of it.",
    body: "A friend mid-laugh. A stranger's small win. A hello that belonged to someone else and still warmed you. You noticed their good, and a little of it became yours.",
    capture: "a photo of their smile, their name on the screen, the moment you were glad to witness.",
    playbackTemplate:
      '"Today, someone else\'s good moment found me. I noticed it. I kept a little of that warmth, and tonight it is mine to hold."',
  },
  {
    id: "no-name-for-it",
    title: "No name for it",
    tagline: "It doesn't fit a box. It still counts.",
    body: "Some moments refuse a name. Rain on the glass. A weird lovely ordinary thing. You don't have to classify it. Noticing it was enough.",
    capture: "exactly as it happened. No category required.",
    playbackTemplate:
      '"Today held something with no name — and I kept it anyway. I noticed it. Tonight it is still mine."',
  },
];

export const WHISPER_MAX = 80;
export const PHOTO_MAX_BYTES = Math.floor(4.5 * 1024 * 1024);

/** Visible accordion. Later ids stay in JOY_TYPES for mismatch suggestions only. */
export const ACCORDION_JOY_IDS = [
  "morning-sunlight",
  "a-small-hello",
  "one-thing-done-slowly",
  "a-little-movement",
  "one-corner-clear",
  "just-this",
] as const;

export function accordionJoys(): JoyType[] {
  return ACCORDION_JOY_IDS.map((id) => {
    const joy = JOY_TYPES.find((item) => item.id === id);
    if (!joy) throw new Error(`Missing accordion joy ${id}`);
    return joy;
  });
}

export function getJoyById(id: string | null | undefined): JoyType | undefined {
  if (!id) return undefined;
  return JOY_TYPES.find((joy) => joy.id === id);
}
