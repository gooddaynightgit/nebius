export type StoryEntryDestination = "/app/joy" | "/moments" | "sign-in";

/**
 * Where "Create your story" goes. No charge: this only reads an existing balance.
 * Signed out stays on the email-and-code gate. Credits above zero open joy.
 * Zero credits open the buy page.
 */
export function createStoryDestination(signedIn: boolean, remaining: number): StoryEntryDestination {
  if (!signedIn) return "sign-in";
  if (remaining > 0) return "/app/joy";
  return "/moments";
}
