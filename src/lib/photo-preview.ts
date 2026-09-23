/** Which image the capture page should show. A local replacement always wins over the saved capture. */
export function capturePreviewSrc(input: {
  localPreviewUrl: string | null;
  hasLocalPhoto: boolean;
  savedMediaUrl: string | null;
}): string | null {
  if (input.hasLocalPhoto) return input.localPreviewUrl;
  return input.localPreviewUrl || input.savedMediaUrl;
}
