/** Shown after the emailed code is accepted and the session cookie is set. */
export const EMAIL_VERIFIED_NOTE = "Email verified ✓";

export function isSixDigitCode(code: string): boolean {
  return /^\d{6}$/.test(code.trim());
}
