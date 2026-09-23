import { describe, expect, it } from "vitest";
import { JOY_TYPES, LANDING, WHISPER_MAX, accordionJoys, getJoyById } from "./landing";

describe("landing copy", () => {
  it("keeps hero and footer text exact", () => {
    expect(LANDING.hero.h1).toBe(
      "You scrolled past a hundred good moments today. None of them were yours.",
    );
    expect(LANDING.hero.subheadline).toBe(
      "Your laugh. Your small win. Your quiet moment. Nobody turned them into anything — not even you. Gooddaynight does →",
    );
    expect(LANDING.hero.cta).toBe("Hear your story — free");
    expect(LANDING.moment.title).toBe("One good moment today");
    expect(LANDING.moment.pictureTitle).toBe("Lay the picture here.");
    expect(LANDING.moment.joyLegend).toBe("(pick one)");
    expect(LANDING.moment.joyLegend).not.toMatch(/What kind of quiet joy/i);
    expect(LANDING.app.photoHelp).toBe(
      "A sky. A gift. A hello on the screen. A screenshot of 3 things you're grateful for — handwritten ones especially welcome ...",
    );
    expect(LANDING.app.heading).toBe("Today. One good moment. Go get it.");
    expect(LANDING.app.yours).toBe("YOURS");
    expect(LANDING.app.brand).toBe("gooddaynight.com");
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
      "Tonight isn’t a YOURS story. This picture isn’t one we can tell. Keep the night gentle.",
    );
    expect(LANDING.app.playMoment).toBe("Play this good moment");
    expect(LANDING.app.pause).toBe("Pause");
    expect(LANDING.app.keep).toBe("Share");
    expect(LANDING.app.keepLabel).toBe("Share tonight’s story with the photo");
    expect(LANDING.app.keepBusy).toBe("Sharing…");
    expect(LANDING.app.replace).toBe("Replace today’s photo");
    expect(LANDING.app.reach).toBe(
      "Couldn't reach Gooddaynight — if you're on the preview link, refresh and sign into Vercel again, then retry.",
    );
    expect(LANDING.app.reachLive).toBe(
      "Couldn't reach Gooddaynight — check your connection and try again.",
    );
    expect(LANDING.app.unexpected).toBe("Couldn't read Gooddaynight's reply. Refresh and try again.");
    expect(LANDING.app.takePhoto).toBe("Take your photo");
    expect(LANDING.app.uploadPhoto).toBe("Upload your photo");
    expect(LANDING.app.keepStill).toBe("Keep this still");
    expect(LANDING.app.cancelCamera).toBe("Cancel");
    expect(LANDING.app.tryAgain).toBe("Try again");
    expect(LANDING.app.joyNeed).toBe("Pick the kind of quiet joy first.");
    expect(LANDING.app.joyQuestion).toBe("What kind of quiet joy was it?");
    expect(LANDING.app.joyPickHint).toBe("(pick one)");
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
    expect(LANDING.app.savedOnPhone).toBe("Saved on this phone — open YOURS from here");
    expect(LANDING.app.resaveFailed).toMatch(/this phone/i);
    expect(LANDING.app.reach).not.toMatch(/Failed to fetch/i);
    expect(LANDING.moment.playbackExample).toMatch(/Example of tonight/i);
    expect(LANDING.footer.changePicture).toBe(
      "You can change the picture if the day gets kinder.",
    );
    expect(LANDING.footer.oneMoment).toBe("One moment. One story.");
    expect(LANDING.footer.somethingGood).toBe("Something good is about to happen!");
    expect(LANDING.footer.site).toBe("Gooddaynight.com");
    expect(LANDING.footer.lookingForward).toBe("Looking forward to hearing from you:");
    expect(LANDING.footer.hello).toBe("hello@gooddaynight.com");
    expect(WHISPER_MAX).toBe(80);
  });

  it("keeps all six quiet-joy playback quotes exact", () => {
    expect(JOY_TYPES.map((joy) => joy.title)).toEqual([
      "Morning sunlight",
      "A small hello",
      "One thing, done slowly",
      "A little movement",
      "One corner, clear",
      "Just this",
      "A sound you stopped for",
      "Someone else's good moment",
      "No name for it",
    ]);
    expect(JOY_TYPES[0]?.playbackTemplate).toBe(
      '"This morning, you stood in the sun. Ten quiet minutes. Gold on your skin. Your body remembered its rhythm. And the day began — gently, breathtakingly, beautifully — with you in it."',
    );
    expect(JOY_TYPES[1]?.playbackTemplate).toBe(
      '"Today, you laughed so hard the room got brighter. You waved like you meant it — and it came right back at you. Somewhere, someone is smiling right now because you exist. That\'s not a small thing. That\'s everything."',
    );
    expect(JOY_TYPES[2]?.playbackTemplate).toBe(
      '"Today, you gave one moment everything — and it gave you back the whole world. Every sense on fire. Every second shining. You weren\'t just doing something today. You were THERE — fully, radiantly, joyfully there."',
    );
    expect(JOY_TYPES[3]?.playbackTemplate).toBe(
      '"Today, you moved — and your body threw a celebration. Endorphins like fireworks, mood soaring, heart singing. You didn\'t just go for a walk today. You turned yourself ON."',
    );
    expect(JOY_TYPES[4]?.playbackTemplate).toBe(
      '"Today, you made order out of chaos — one beautiful corner at a time. You looked at what you built and felt that deep, golden calm: I did this. Your space is brighter. And so are you."',
    );
    expect(JOY_TYPES[5]?.playbackTemplate).toBe(
      '"Today held something that doesn\'t fit in any box — and it was yours. You noticed it. You kept it. Some moments are too alive for categories, and tonight, this one is yours to relive, word by word."',
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
