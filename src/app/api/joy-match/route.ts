import { badRequest, json } from "@/lib/http";
import { witnessJoyMatch } from "@/lib/joy-match";
import { getJoyById } from "@/lib/landing";
import { imageDataUrlForModels } from "@/lib/model-image";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

/** Joy tap witness. Failures return MATCH so the night is never blocked. */
export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const joy = getJoyById(String(form.get("joyType") ?? ""));
    const file = form.get("file");
    if (!joy) return badRequest("Pick the kind of quiet joy first.");
    if (!(file instanceof File) || file.size <= 0) {
      return json({ verdict: "MATCH" });
    }
    const bytes = Buffer.from(await file.arrayBuffer());
    const imageDataUrl = imageDataUrlForModels(file.type || "image/jpeg", bytes);
    const result = await witnessJoyMatch({
      joyTitle: joy.title,
      imageDataUrl,
    });
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
