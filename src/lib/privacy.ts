/** Shown under email and OTP fields. Primary copy; short is the tight-space fallback. */
export const PRIVACY_LINE_SIGN_IN =
  "Your email is only for signing you in and keeping your moments yours.";

export const PRIVACY_LINE_TRAINING =
  "We do not use your photos or words to train AI and not for anyone else’s model or use.";

export const PRIVACY_LINE_PERSONAL =
  "Your moments stay personal — for your security and privacy.";

export const PRIVACY_LINE_GOOGLE =
  "We use Google Analytics and Google advertising cookies, including a conversion measurement when a payment succeeds.";

/** Line 1, line 2 on the next line, then a blank line, then the personal and Google lines. */
export const PRIVACY_NOTE = `${PRIVACY_LINE_SIGN_IN}\n${PRIVACY_LINE_TRAINING}\n\n${PRIVACY_LINE_PERSONAL}\n${PRIVACY_LINE_GOOGLE}`;

export const PRIVACY_NOTE_SHORT =
  "Email keeps your moments yours. Your photos and words are never used to train AI. We use Google Analytics and advertising cookies, including a conversion when a payment succeeds.";
