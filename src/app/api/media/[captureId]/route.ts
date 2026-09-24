import { json } from "@/lib/http";
import { loadSessionVault, requirePersonalPhotoOtp } from "@/lib/session";
import { getBytes } from "@/lib/storage";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ captureId: string }> },
) {
  const denied = await requirePersonalPhotoOtp();
  if (denied) return denied;
  const { captureId } = await context.params;
  const { vault } = await loadSessionVault();
  const capture = vault.captures.find((c) => c.id === captureId);
  if (!capture?.mediaKey) {
    return json({ error: "Not found" }, 404);
  }
  const file = await getBytes(capture.mediaKey);
  if (!file) return json({ error: "Not found" }, 404);
  return new Response(new Uint8Array(file.body), {
    headers: {
      "Content-Type": capture.mediaContentType || file.contentType,
      "Cache-Control": "private, no-cache",
    },
  });
}
