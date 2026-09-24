import { MODELS, hasTokenFactoryKey } from "@/lib/config";
import { todayStamp } from "@/lib/identity";
import { json } from "@/lib/http";
import { loadSessionVault, presentSession } from "@/lib/session";
import { storageBackend } from "@/lib/storage";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const day = url.searchParams.get("day") || todayStamp();
  const { sessionId, vault } = await loadSessionVault();
  return json({
    ...(await presentSession(vault, sessionId, day)),
    health: {
      tokenFactory: hasTokenFactoryKey(),
      storage: storageBackend(),
      models: MODELS,
      sonicListable: Boolean(MODELS.sonic),
    },
  });
}

export async function POST(request: Request) {
  return GET(request);
}
