/** Which image the capture page should show. A local replacement always wins over the saved capture. */
export function capturePreviewSrc(input: {
  localPreviewUrl: string | null;
  hasLocalPhoto: boolean;
  savedMediaUrl: string | null;
}): string | null {
  if (input.hasLocalPhoto) return input.localPreviewUrl;
  return input.localPreviewUrl || input.savedMediaUrl;
}

/**
 * The what-question is open only after Yes or No on the spark that is on screen.
 * A replacement bumps the generation and hides the box until they answer again.
 */
export function isCaptureQuestionOpen(input: {
  sparkPending: boolean;
  hasSpark: boolean;
  sparkGeneration: number;
  answeredGeneration: number | null;
}): boolean {
  if (input.sparkPending || !input.hasSpark) return false;
  return input.answeredGeneration != null && input.answeredGeneration === input.sparkGeneration;
}
