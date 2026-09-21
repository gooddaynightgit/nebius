import { MODELS, blobAccess, hasNebiusObjectStorage, hasTokenFactoryKey, hasVercelBlob } from "@/lib/config";
import { json } from "@/lib/http";
import { probeVercelBlob, storageBackend } from "@/lib/storage";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const probeStorage = url.searchParams.get("probe") === "storage";
  return json({
    ok: true,
    tokenFactory: hasTokenFactoryKey(),
    storage: storageBackend(),
    vercelBlob: hasVercelBlob(),
    blobAccess: hasVercelBlob() ? blobAccess() : null,
    objectStorage: hasNebiusObjectStorage(),
    ...(probeStorage ? { blobProbe: await probeVercelBlob() } : {}),
    models: {
      nano: MODELS.nano,
      nanoOmni: MODELS.nanoOmni,
      vision: MODELS.vision,
      story: MODELS.story,
      super: MODELS.super,
      ultra: MODELS.ultra,
      sonic: MODELS.sonic || null,
    },
    sonicListable: Boolean(MODELS.sonic),
    funnel: {
      landingEmail: false,
      emailAfterFirstCapture: true,
    },
  });
}
