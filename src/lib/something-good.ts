/** Something Good: the same words the Alexa skill speaks, shared with the web version. */

export const SG_PATH = "/something-good";
export const SG_HEADLINE = "Name what you're not grateful for";
export const SG_BUTTON = "Start";
export const SG_SUPPORT = "Support to lead you to something good.";
export const SG_DESCRIPTION =
  "Name what you're not grateful for. A gentle voice guides one slow breath, then says your own words back with one hopeful line: something good is about to happen.";

export type SgFocus = "challenge" | "situation" | "missing" | "change" | "else";

/** The five choices on the start screen; `focus` shapes the question the server asks. */
export const SG_OPTIONS: { focus: SgFocus; label: string }[] = [
  { focus: "challenge", label: "A challenge" },
  { focus: "situation", label: "A situation" },
  { focus: "missing", label: "Something missing" },
  { focus: "change", label: "Something you want to change" },
  { focus: "else", label: "Something else" },
];

export const SG_CHOOSE_FIRST = "Please choose the one that feels closest, then tap Start.";

export const SG_WELCOME =
  "Welcome. I'm so glad you're here. This is the place to name what you're not grateful for. And here's the good news: you don't have to carry it alone. I'm here to help you find the good that's waiting inside it.";

/** One guided breath: Alexa guides, it never claims to breathe with you. */
export const SG_BREATH_FIRST = "Let's start with one slow, deep breath.";
export const SG_BREATH_TWO = "Let's take two more slow breaths.";
export const SG_BREATH_IN = "Breathe in slowly…";
export const SG_BREATH_HOLD = "Hold it gently…";
export const SG_BREATH_RELEASE = "Slowly release…";
export const SG_BREATH_LET_GO = "just let it go.";
export const SG_TAKE_TIME = "Take your time. There's no rush.";

/** Seconds: in 4, hold 2, out 7 (the long out-breath is the letting go). */
export const SG_BREATH_MS = { in: 4000, hold: 2000, out: 7000 } as const;

export const SG_QUESTION =
  "Right at this moment, tell me: what challenge or situation are you dealing with? Or is there something you'd like to change, or something missing in your life?";

export const SG_BASICS = [
  "First, something simple. A cup of tea, or a warm bed tonight. Thank you for that.",
  "Now a person. Someone who smiled at you, or called. Thank you for them.",
  "And one more. A meal, clean water, being alive today. Thank you for that.",
] as const;


export const SG_CLOSE = "It's going to be alright. All is well. Something good is about to happen.";

/** Turn what the person typed into the words after "with". Never claims it is solved. */
export function sgSubject(raw: string): string {
  const text = raw.trim().replace(/\s+/g, " ").replace(/[.!?]+$/, "");
  if (!text) return "what you named";
  const lowered = /^[A-Z][a-z]/.test(text) && !/^I\b/.test(text) ? text[0].toLowerCase() + text.slice(1) : text;
  return lowered.replace(/\bmy\b/gi, "your").replace(/\bmine\b/gi, "yours");
}

export function sgThankYou(raw: string): string {
  return `Thank you. Something good is about to happen with ${sgSubject(raw)}.`;
}

export const SG_HOW_PATH = "/something-good/how-it-works";
export const SG_FAQ_PATH = "/something-good/faq";

export const isSgPath = (pathname: string | null | undefined) =>
  pathname === SG_PATH || Boolean(pathname?.startsWith(`${SG_PATH}/`));

export const SG_EXAMPLE_PATH = "/something-good/example";

/** On Something Good pages the usual guide links open the Something Good versions. */
export const SG_GUIDE_SWAP: Record<string, string> = {
  "/how-it-works": SG_HOW_PATH,
  "/example": SG_EXAMPLE_PATH,
  "/faq": SG_FAQ_PATH,
};

/** One worked example, start to finish. */
export const SG_EXAMPLE = {
  chose: "A situation",
  notGrateful: "Renting a tiny flat I can't really afford, and never feeling settled.",
  perfect: "I am living in my own home.\nI have the money to pay for it with ease.\nI am happy & grateful I have a garden.",
  card: "Thank you. I am living in my own home. I have the money to pay for it with ease. I am happy & grateful I have a garden. Something good is about to happen.",
};

export const SG_HOW_STEPS: { title: string; body: string }[] = [
  {
    title: "Choose what to name",
    body: "A challenge, a situation, something missing, something you want to change, or something else. Pick the one that feels closest.",
  },
  {
    title: "Breathe",
    body: "One slow guided breath. In for 4 seconds, hold for 2, then a long, slow release. Just let it go.",
  },
  {
    title: "Name what you're not grateful for",
    body: "Take your time. Consider what it is in your life that you're not grateful for. You don't have to pretend it's fine.",
  },
  {
    title: "Turn it around",
    body: "Right now, at this moment in time, turn it around. Say or type your perfect result, as if it's already true: \"I am living in my own home.\"",
  },
  {
    title: "Thank you",
    body: "Your perfect result appears in your own words. Thank you. Something good is about to happen.",
  },
];

export const SG_HOW_NOTE =
  "About two minutes. Use Prev, Stop and Next at the top whenever you need to. Stop only pauses the voice, and you can carry on when you're ready.";

export const SG_FAQ: { q: string; a: string }[] = [
  {
    q: "What is Something Good?",
    a: "A short, gentle voice ritual for the days when it's hard to feel grateful. You name what you're not grateful for, take a slow breath, turn it around into your perfect result, and hear: something good is about to happen.",
  },
  {
    q: "Why start with what I'm not grateful for?",
    a: "Because forced gratitude can feel like a lie on a hard day. Starting with the honest truth makes the turnaround feel real, not forced.",
  },
  {
    q: "Does it fix my problem?",
    a: "No, and it never pretends to. It helps you hold the hard part with a little more hope, and see the result you'd like instead.",
  },
  {
    q: "Do I have to speak?",
    a: "No. You can type your perfect result instead, and you can edit anything the mic heard.",
  },
  {
    q: "Are my words saved?",
    a: "No. Your words aren't stored. They're only used to check spelling and kindness, and to show your closing card. If you use the mic, your phone's own speech service turns your voice into text.",
  },
  {
    q: "Why won't it let me finish?",
    a: "Your perfect result needs a few kind, clear words, like \"I have my own home\". If something needs changing, a gentle note under the box tells you what.",
  },
  {
    q: "What if I'm really struggling?",
    a: "If you're thinking about harming yourself, please reach out now. In South Africa, call the SADAG Suicide Crisis Helpline on 0800 567 567 (free, 24 hours). Elsewhere, call your local emergency number or find a free helpline at findahelpline.com.",
  },
  {
    q: "Can I use it with Alexa?",
    a: "Something Good is being built for Alexa+, so you can do the whole ritual by voice. The web version here works on any phone.",
  },
];

const SITE = "https://gooddaynight.com";

/** Structured data (schema.org) so search engines and AI assistants understand Something Good. */
export function sgAppJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "Something Good",
    alternateName: SG_HEADLINE,
    url: `${SITE}${SG_PATH}`,
    description: SG_DESCRIPTION,
    applicationCategory: "LifestyleApplication",
    operatingSystem: "Any (web browser); Alexa+",
    inLanguage: "en",
    publisher: { "@type": "Organization", name: "GoodDayNight", url: SITE },
  };
}

export function sgFaqJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: SG_FAQ.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  };
}

export function sgHowToJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: "How Something Good works",
    description: SG_HOW_NOTE,
    totalTime: "PT2M",
    step: SG_HOW_STEPS.map((step, i) => ({
      "@type": "HowToStep",
      position: i + 1,
      name: step.title,
      text: step.body,
    })),
  };
}

/** Safe to drop into a <script type="application/ld+json">. */
export const jsonLdHtml = (data: unknown) => JSON.stringify(data).replace(/</g, "\\u003c");
