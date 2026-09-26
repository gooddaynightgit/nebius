import { isCronAuthorized } from "@/lib/cron-auth";
import { json, unauthorized } from "@/lib/http";
import { sweepExpiredMoments } from "@/lib/moment-sweep";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request: Request) {
  if (!isCronAuthorized(request)) {
    return unauthorized("This sweep is only for the daily job.");
  }
  try {
    const result = await sweepExpiredMoments();
    console.log(
      `[moment-sweep] cutoff=${result.cutoffDay} seen=${result.vaultsSeen} purged=${result.vaultsPurged} failures=${result.failures} done=${result.done}`,
    );
    return json(result);
  } catch (error) {
    console.error("[moment-sweep] run stopped", error);
    return json({ error: "The daily sweep stopped early." }, 500);
  }
}
