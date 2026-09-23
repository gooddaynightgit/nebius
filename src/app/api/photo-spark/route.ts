import { json } from "@/lib/http";
import { LANDING } from "@/lib/landing";
import { imageDataUrlForModels } from "@/lib/model-image";
import { mockExcavation } from "@/lib/prompts";
import { withHumbleCloser } from "@/lib/spark-closer";
import { sparkForPhoto } from "@/lib/weave";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

/** Photo-spark witness. A missing photo still gets a humble stand-in; BLOCK stays explicit. */
export async function POST(request: Request) {
  let file: FormDataEntryValue | null = null;
  try {
    const form = await request.formData();
    file = form.get("file");
  } catch {
    return json({ spark: withHumbleCloser(mockExcavation({})) });
  }
  if (!(file instanceof File) || file.size <= 0) {
    return json({ spark: withHumbleCloser(mockExcavation({})) });
  }
  try {
    const bytes = Buffer.from(await file.arrayBuffer());
    const imageDataUrl = imageDataUrlForModels(file.type || "image/jpeg", bytes);
    const result = await sparkForPhoto(imageDataUrl);
    if ("blocked" in result) return json({ blocked: true, spark: LANDING.app.blocked });
    return json({ spark: withHumbleCloser(result.spark) });
  } catch {
    return json({ spark: withHumbleCloser(mockExcavation({})) });
  }
}
