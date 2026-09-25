import sharp from "sharp";
import { PHOTO_NOT_A_PICTURE, blankFromSamples, isStillImageFile } from "./photo-picture";

/**
 * Server gate for an uploaded still. Rejects video and other non-images,
 * and a 64×64 field that is black, white, or one flat colour.
 * Unreadable bytes are not a photo.
 */
export async function uploadedPictureRejection(input: {
  bytes: Buffer;
  mime: string;
  filename: string;
}): Promise<string | null> {
  if (!isStillImageFile({ type: input.mime, name: input.filename })) return PHOTO_NOT_A_PICTURE;
  if (!input.bytes.length) return PHOTO_NOT_A_PICTURE;
  try {
    const { data, info } = await sharp(input.bytes, { failOn: "none", animated: false })
      .rotate()
      .resize(64, 64, { fit: "fill" })
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    const channels = info.channels >= 4 ? 4 : 3;
    if (blankFromSamples(data, channels).blank) return PHOTO_NOT_A_PICTURE;
    return null;
  } catch {
    return PHOTO_NOT_A_PICTURE;
  }
}
