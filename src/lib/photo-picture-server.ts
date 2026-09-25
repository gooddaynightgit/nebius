import sharp from "sharp";
import {
  PHOTO_NOT_A_PICTURE,
  PHOTO_NOT_CLEAR,
  PICTURE_EDGE,
  isStillImageFile,
  pictureStats,
} from "./photo-picture";

/**
 * Server gate for an uploaded still. Rejects video and other non-images.
 * A 64×64 greyscale copy that is flat, near-uniform, or almost black with
 * no detail is not a clear picture. Unreadable bytes are not a photo.
 */
export async function uploadedPictureRejection(input: {
  bytes: Buffer;
  mime: string;
  filename: string;
}): Promise<string | null> {
  if (!isStillImageFile({ type: input.mime, name: input.filename })) return PHOTO_NOT_A_PICTURE;
  if (!input.bytes.length) return PHOTO_NOT_A_PICTURE;
  try {
    const size = PICTURE_EDGE.sample;
    const { data, info } = await sharp(input.bytes, { failOn: "none", animated: false })
      .rotate()
      .resize(size, size, { fit: "fill" })
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    const channels = info.channels >= 4 ? 4 : 3;
    if (pictureStats(data, channels, info.width, info.height).unclear) return PHOTO_NOT_CLEAR;
    return null;
  } catch {
    return PHOTO_NOT_A_PICTURE;
  }
}
