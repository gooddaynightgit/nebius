import { badRequest, json } from "@/lib/http";
import { witnessJoyMatch } from "@/lib/joy-match";
import { getJoyById, LANDING } from "@/lib/landing";
import { imageDataUrlForModels } from "@/lib/model-image";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Joy tap witness. A missing photo or Token Factory key is explicit.
 * Model and transport failures still fail open as MATCH.
 */
export async function POST(request: Request) {
  let joyId = "";
  let file: FormDataEntryValue | null = null;
  try {
    const form = await request.formData();
    joyId = String(form.get("joy_type") || form.get("joyType") || "");
    file = form.get("file");
  } catch {
    return json({ verdict: "MATCH" });
  }

  const joy = getJoyById(joyId);
  if (!joy) return badRequest("Pick the kind of quiet joy first.");
  if (!(file instanceof File) || file.size <= 0) {
    return json({ verdict: "NEED_PHOTO" });
  }

  try {
    const bytes = Buffer.from(await file.arrayBuffer());
    const imageDataUrl = imageDataUrlForModels(file.type || "image/jpeg", bytes);
    const result = await witnessJoyMatch({
      joyTitle: joy.title,
      imageDataUrl,
    });
    if (result.kind === "need-photo") return json({ verdict: "NEED_PHOTO" });
    if (result.kind === "unavailable") {
      return json({ verdict: "UNAVAILABLE", note: LANDING.app.witnessQuiet });
    }
    if (result.kind === "mismatch") {
      return json({
        verdict: "MISMATCH",
        line: result.line,
        suggestedJoyId: result.suggestedJoyId,
      });
    }
    return json({ verdict: "MATCH" });
  } catch {
    return json({ verdict: "MATCH" });
  }
}
