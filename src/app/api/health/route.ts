import { MODELS, hasNebiusObjectStorage, hasTokenFactoryKey } from "@/lib/config";
import { json } from "@/lib/http";
import { storageBackend } from "@/lib/storage";

export const dynamic = "force-dynamic";

export async function GET() {
  return json({
    ok: true,
    tokenFactory: hasTokenFactoryKey(),
    storage: storageBackend(),
    objectStorage: hasNebiusObjectStorage(),
    models: {
      nano: MODELS.nano,
      nanoOmni: MODELS.nanoOmni,
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
