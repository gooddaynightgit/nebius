import { json } from "@/lib/http";
import { loadSessionVault } from "@/lib/session";
import { getBytes } from "@/lib/storage";
import { lastStory } from "@/lib/vault";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const { vault } = await loadSessionVault();
  const story = lastStory(vault);
  if (!story?.tts.audioKey) return json({ error: "No story audio yet" }, 404);
  const file = await getBytes(story.tts.audioKey);
  if (!file) return json({ error: "No story audio yet" }, 404);
  return new Response(new Uint8Array(file.body), {
    headers: {
      "Content-Type": story.tts.contentType || file.contentType,
      "Cache-Control": "private, max-age=60",
    },
  });
}
