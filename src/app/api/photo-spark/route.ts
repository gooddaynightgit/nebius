import { badRequest, json } from "@/lib/http";
import { uploadedPictureRejection } from "@/lib/photo-picture-server";
import { LANDING } from "@/lib/landing";
import { requirePersonalPhotoOtp } from "@/lib/session";
import { imageDataUrlForModels } from "@/lib/model-image";
import { mockExcavation } from "@/lib/prompts";
import { applySparkVoice, chooseSparkVoice } from "@/lib/spark-closer";
import { sparkForPhoto } from "@/lib/weave";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

function readFormIndex(value: FormDataEntryValue | null): number | undefined {
  if (typeof value !== "string" || !/^-?\d+$/.test(value.trim())) return undefined;
  return Number(value);
}

function dressedSpark(
  raw: string,
  voice: { opener: string; closer: string; openerIndex: number; closerIndex: number },
) {
  return json({
    spark: applySparkVoice(raw, voice),
    openerIndex: voice.openerIndex,
    closerIndex: voice.closerIndex,
  });
}

/** Photo-spark witness. A missing photo still gets a humble stand-in; BLOCK stays explicit. */
export async function POST(request: Request) {
  let file: FormDataEntryValue | null = null;
  let openerIndex: number | undefined;
  let closerIndex: number | undefined;
  try {
    const form = await request.formData();
    file = form.get("file");
    openerIndex = readFormIndex(form.get("openerIndex"));
    closerIndex = readFormIndex(form.get("closerIndex"));
  } catch {
    const voice = chooseSparkVoice(null);
    return dressedSpark(mockExcavation({ voice }), voice);
  }
  const voice = chooseSparkVoice({ openerIndex, closerIndex });
  if (!(file instanceof File) || file.size <= 0) {
    return dressedSpark(mockExcavation({ voice }), voice);
  }
  const denied = await requirePersonalPhotoOtp();
  if (denied) return denied;
  try {
    const bytes = Buffer.from(await file.arrayBuffer());
    const picture = await uploadedPictureRejection({
      bytes,
      mime: file.type || "",
      filename: file.name || "",
    });
    if (picture) return badRequest(picture);
    const imageDataUrl = imageDataUrlForModels(file.type || "image/jpeg", bytes);
    const result = await sparkForPhoto(imageDataUrl, voice);
    if ("blocked" in result) return json({ blocked: true, spark: LANDING.app.blocked });
    return dressedSpark(result.spark, voice);
  } catch {
    return dressedSpark(mockExcavation({ voice }), voice);
  }
}
