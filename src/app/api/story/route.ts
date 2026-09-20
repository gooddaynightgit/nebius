import { todayStamp } from "@/lib/identity";
import { json } from "@/lib/http";
import { loadSessionVault, toPublicSession } from "@/lib/session";
import { lastStory, lastStoryForDay } from "@/lib/vault";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const day = url.searchParams.get("day") || todayStamp();
  const { sessionId, vault } = await loadSessionVault();
  const story = lastStoryForDay(vault, day) ?? lastStory(vault);
  return json({
    session: toPublicSession(vault, sessionId, day),
    story,
  });
}
