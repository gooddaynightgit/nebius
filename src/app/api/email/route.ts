import { attachEmail, mergeCapturesIntoVault, saveVault } from "@/lib/vault";
import { isValidEmail, normalizeEmail, todayStamp } from "@/lib/identity";
import { badRequest, json } from "@/lib/http";
import { loadSessionVault, setGateEmail, toPublicSession } from "@/lib/session";
import type { CaptureRecord } from "@/lib/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type EmailBody = {
  email?: string;
  day?: string;
  captures?: Array<Partial<CaptureRecord>>;
};

export async function POST(request: Request) {
  const { sessionId, vault } = await loadSessionVault();
  const body = ((await request.json().catch(() => null)) ?? {}) as EmailBody;
  const day = body.day || todayStamp();
  const added = mergeCapturesIntoVault(vault, body.captures, day);
  if (added) await saveVault(vault);
  if (vault.captures.length < 1) {
    return badRequest("Save at least one moment before unlocking your story.");
  }
  const email = normalizeEmail(body.email ?? "");
  if (!isValidEmail(email)) return badRequest("Enter a valid email.");
  const next = await attachEmail(sessionId, email);
  await setGateEmail(email);
  return json({ session: toPublicSession(next, sessionId, day) });
}
