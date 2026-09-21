import { MODELS, hasTokenFactoryKey } from "@/lib/config";
import { todayStamp } from "@/lib/identity";
import { json } from "@/lib/http";
import { presentSession, readSessionId } from "@/lib/session";
import { storageBackend } from "@/lib/storage";
import { getOrCreateAnonVault } from "@/lib/vault";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const day = url.searchParams.get("day") || todayStamp();
  const sessionId = await readSessionId();
  const vault = await getOrCreateAnonVault(sessionId);
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
  await readSessionId();
  return GET(request);
}
