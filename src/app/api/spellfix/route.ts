import { proposeSpellfix } from "@/lib/spellfix";
import { badRequest, json } from "@/lib/http";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = ((await request.json().catch(() => ({}))) ?? {}) as { text?: string };
  const text = String(body.text ?? "").trim();
  if (!text) return badRequest("Write a moment first.");
  return json(await proposeSpellfix(text));
}
