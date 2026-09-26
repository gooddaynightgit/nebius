import { timingSafeEqual } from "node:crypto";
import { cronSecret } from "./config";

/** True only when `Authorization: Bearer $CRON_SECRET` matches. Empty secret refuses every caller. */
export function isCronAuthorized(request: Request): boolean {
  const secret = cronSecret();
  if (!secret) return false;
  const header = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret}`;
  const left = Buffer.from(header);
  const right = Buffer.from(expected);
  if (left.length !== right.length) {
    timingSafeEqual(right, right);
    return false;
  }
  return timingSafeEqual(left, right);
}
