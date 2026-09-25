import { describe, expect, it } from "vitest";
import { JOY_TYPES, LANDING, WHISPER_MAX, accordionJoys, getJoyById } from "./landing";

describe("landing copy", () => {
  it("keeps hero and footer text exact", () => {
    expect(LANDING.hero.h1).toBe(
      "You scrolled past a hundred good moments today. None of them were yours.",
    );
    expect(LANDING.hero.subheadline).toBe(
      "Your laugh. Your small win. Your quiet moment. Nobody turned them into anything — not even you.",
    );
    expect(LANDING.hero.cta).toBe("Hear your story — free");
    expect(LANDING.moment.title).toBe("One good moment today");
    expect(LANDING.moment.pictureTitle).toBe("Lay the picture here.");
    expect(LANDING.moment.joyLegend).toBe("(pick one)");
    expect(LANDING.moment.joyLegend).not.toMatch(/What kind of quiet joy/i);
    expect(LANDING.app.photoHelp).toBe(
      "A sky. A gift. A hello on the screen. A screenshot of 3 things you're grateful for — handwritten ones especially welcome ...",
    );
    expect(LANDING.app.heading).toBe("Today.");
    expect(LANDING.app.noticingTitle).toBe("Moments worth noticing:");
    expect(LANDING.app.noticing).toEqual([
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
    ]);
    expect(LANDING.app.noticingClose).toBe(
      "One of these happens to you almost every day. Most nights, it’s already gone.",
    );
    expect(LANDING.app.noticingClose).toMatch(/it’s/);
    expect(LANDING.app.noticing.join(" ")).toMatch(/you’re/);
    expect(LANDING.app.yours).toBe("My good moment weaved");
    expect(LANDING.app.brand).toBe("GoodDayNight");
    expect(LANDING.app.captionLabel).toBe("What is the good in this moment?");
    expect(LANDING.app.sparkWait).toBe("Let me see your good moment capture");
    expect(LANDING.app.sparkYes).toBe("Yes");
    expect(LANDING.app.sparkNo).toBe("No");
    expect(LANDING.app.captionLabel).not.toMatch(/80/);
    expect(LANDING.app.captionLabel).not.toMatch(/Optional caption/i);
    expect(LANDING.app.captionHelp).toBe(
      "Write what the picture cannot say: a name, a step count, “he wrote back.”",
    );
    expect(LANDING.app.captionExamples).toBe("a name / a step count / he wrote back");
    expect(JSON.stringify(LANDING.app)).not.toMatch(/It sits beside the photo/);
    expect(JSON.stringify(LANDING.app)).not.toMatch(/one line, 80 characters/);
    expect(LANDING.app.blocked).toBe(
      "Tonight isn’t a story we can create. This picture isn’t one we can tell. Keep the night gentle.",
    );
    expect(LANDING.app.playMoment).toBe("Play this good moment");
    expect(LANDING.app.pause).toBe("Pause");
    expect(LANDING.app.keep).toBe("Share");
    expect(LANDING.app.keepLabel).toBe("Share tonight’s story with the photo");
    expect(LANDING.app.keepBusy).toBe("Sharing…");
    expect(LANDING.app.replace).toBe("Replace today’s photo");
    expect(LANDING.app.reach).toBe(
      "Couldn't reach GoodDayNight — if you're on the preview link, refresh and sign into Vercel again, then retry.",
    );
    expect(LANDING.app.reachLive).toBe(
      "Couldn't reach GoodDayNight — check your connection and try again.",
    );
    expect(LANDING.app.unexpected).toBe("Couldn't read GoodDayNight's reply. Refresh and try again.");
    expect(LANDING.app.takePhoto).toBe("Take your photo");
    expect(LANDING.app.uploadPhoto).toBe("Upload your photo");
    expect(LANDING.app.keepStill).toBe("Keep this still");
    expect(LANDING.app.cancelCamera).toBe("Cancel");
    expect(LANDING.app.tryAgain).toBe("Try again");
    expect(LANDING.app.joyNeed).toBe("Pick the kind of quiet joy first.");
    expect(LANDING.app.joyQuestion).toBe("What joy is it?");
    expect(LANDING.app.joyPickHint).toBe("(pick one to Create your story)");
    expect(LANDING.app.alreadyPickedLink).toBe("See your Created story");
    expect(LANDING.app.alreadyPickedEmpty).toBe("Nothing saved yet. Pick a new one.");
    expect(LANDING.app.nextJoy).toBe("Pick the quiet joy");
    expect(JSON.stringify(LANDING.app)).not.toMatch(/Switch it/);
    expect(JSON.stringify(LANDING.app)).not.toMatch(/Keep mine/);
    expect(LANDING.app.photoNeed).toBe("Add one photo from today.");
    expect(LANDING.app.witnessQuiet).toBe("The witness didn’t look. The caption is still yours.");
    expect(LANDING.app.tooLarge).toBe("That photo is too large — try again after we shrink it");
    expect(LANDING.app.tooLargeKeep).toBe("Keep photos under 4.5 MB.");
    expect(LANDING.app.heicAsk).toMatch(/JPEG or PNG/i);
    expect(LANDING.app.yoursMissing).toBe("Save today's photo and pick a joy first.");
    expect(LANDING.app.keepingMoment).toBe("Keeping your moment…");
    expect(LANDING.app.savedOnPhone).toBe("Saved on this phone — open Create your story from here");
    expect(LANDING.app.resaveFailed).toMatch(/this phone/i);
    expect(LANDING.app.reach).not.toMatch(/Failed to fetch/i);
    expect(LANDING.app.playbackLead).toBe(
      "Here's how a good moment reads once it's weaved.",
    );
    expect(LANDING.moment.playbackTitle).toBe("Create your story");
    expect(LANDING.moment.playbackExample).toBe(
      "Example of tonight’s tone — not your story yet. Create your story from this photo.",
    );
    expect(LANDING.moment.playbackExample).not.toMatch(/YOURS/);
    expect(
      JOY_TYPES.every(
        (joy) => !/\bYOURS\b/.test(joy.playbackTemplate) && !/story playback/i.test(joy.playbackTemplate),
      ),
    ).toBe(true);
    expect(LANDING.footer.changePicture).toBe(
      "You can change the picture if the day gets kinder.",
    );
    expect(LANDING.footer.oneMoment).toBe("One moment. One story.");
    expect(LANDING.footer.somethingGood).toBe("Something good is about to happen!");
    expect(LANDING.footer.site).toBe("gooddaynight.com");
    expect(LANDING.footer.lookingForward).toBe("Looking forward to hearing from you:");
    expect(LANDING.footer.hello).toBe("hello@gooddaynight.com");
    expect(WHISPER_MAX).toBe(80);
  });

  it("keeps all six quiet-joy playback quotes exact", () => {
    expect(JOY_TYPES.map((joy) => joy.title)).toEqual([
      "Morning sunlight",
      "A hello",
      "One thing, done slowly",
      "A little movement",
      "One corner, clear",
      "Just this",
      "A sound you stopped for",
      "Someone else's good moment",
      "No name for it",
    ]);
    expect(JOY_TYPES[0]?.playbackTemplate).toBe(
      '"This morning, I stood in the sun. Ten quiet minutes. Gold on my skin. My body remembered its rhythm. And the day began — gently, breathtakingly, beautifully — with me in it."',
    );
    expect(JOY_TYPES[1]?.playbackTemplate).toBe(
      '"Today, I laughed so hard the room got brighter. I waved like I meant it — and it came right back at me. Somewhere, someone is smiling right now because I exist. That\'s not a small thing. That\'s everything."',
    );
    expect(JOY_TYPES[2]?.playbackTemplate).toBe(
      '"Today, I gave one moment everything — and it gave me back the whole world. Every sense on fire. Every second shining. I wasn\'t just doing something today. I was THERE — fully, radiantly, joyfully there."',
    );
    expect(JOY_TYPES[3]?.playbackTemplate).toBe(
      '"Today, I moved — and my body threw a celebration. Endorphins like fireworks, mood soaring, heart singing. I didn\'t just go for a walk today. I turned myself ON."',
    );
    expect(JOY_TYPES[4]?.playbackTemplate).toBe(
      '"Today, I made order out of chaos — one beautiful corner at a time. I looked at what I built and felt that deep, golden calm: I did this. My space is brighter. And so am I."',
    );
    expect(JOY_TYPES[5]?.playbackTemplate).toBe(
      '"Today held something that doesn\'t fit in any box — and it was mine. I noticed it. I kept it. Some moments are too alive for categories, and tonight, this one is mine to relive, word by word."',
    );
    expect(JOY_TYPES[0]?.tagline).toBe(
      "You stepped into the early gold and let the day find you.",
    );
    expect(JOY_TYPES[3]?.tagline).toBe(
      "Your body remembered it was yours. A walk. A stretch. The long way home.",
    );
    expect(accordionJoys().map((joy) => joy.id)).toEqual([
      "morning-sunlight",
      "a-small-hello",
      "one-thing-done-slowly",
      "a-little-movement",
      "one-corner-clear",
      "just-this",
    ]);
    expect(accordionJoys()).toHaveLength(6);
    expect(JOY_TYPES.map((joy) => joy.id)).toContain("a-sound-you-stopped-for");
    expect(JOY_TYPES.map((joy) => joy.id)).toContain("someone-elses-good-moment");
    expect(JOY_TYPES.map((joy) => joy.id)).toContain("no-name-for-it");
    expect(getJoyById("just-this")?.tagline).toBe(
      "You don't have to name the category. The photo already knows.",
    );
    expect(getJoyById("a-sound-you-stopped-for")?.title).toBe("A sound you stopped for");
    expect(getJoyById("someone-elses-good-moment")?.title).toBe("Someone else's good moment");
    expect(getJoyById("no-name-for-it")?.title).toBe("No name for it");
    expect(getJoyById("no-name-for-it")?.playbackTemplate).toMatch(/no name/i);
    expect(JOY_TYPES[2]?.body).toContain("This is being gloriously, completely alive.");
    expect(JOY_TYPES[4]?.capture).toBe(
      "a photo of the cleared surface gleaming, your hands mid-tidy, the before-and-after smile on your face.",
    );
    expect(JOY_TYPES[1]?.body).toContain("*you crossed my mind and it made me grin.*");
    expect(getJoyById("morning-sunlight")?.title).toBe("Morning sunlight");
    expect(getJoyById("missing")).toBeUndefined();
  });
});
