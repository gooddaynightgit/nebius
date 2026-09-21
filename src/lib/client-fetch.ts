import { LANDING } from "./landing";

export const PREVIEW_UNREACHABLE = LANDING.app.reach;
export const PRODUCTION_UNREACHABLE = LANDING.app.reachLive;
export const UNEXPECTED_RESPONSE = LANDING.app.unexpected;
export const JOY_NEED = LANDING.app.joyNeed;
export const PHOTO_TOO_LARGE = LANDING.app.tooLarge;
export const PHOTO_TOO_LARGE_KEEP = LANDING.app.tooLargeKeep;

const GATEWAY_STATUSES = new Set([413, 502, 504]);

export function isGatewayStatus(status: number): boolean {
  return GATEWAY_STATUSES.has(status);
}

export function looksLikePayloadTooLarge(res: Response, body = ""): boolean {
  if (res.status === 413) return true;
  return /FUNCTION_PAYLOAD_TOO_LARGE|Request Entity Too Large|Payload Too Large/i.test(body);
}

const PRODUCTION_HOSTS = new Set([
  "nebius-liart.vercel.app",
  "gooddaynight.com",
  "www.gooddaynight.com",
  "localhost",
  "127.0.0.1",
]);

export function currentHostname(): string {
  if (typeof window === "undefined") return "";
  return window.location.hostname.replace(/:\d+$/, "").toLowerCase();
}

export function isPreviewHost(hostname = currentHostname()): boolean {
  const host = hostname.replace(/:\d+$/, "").toLowerCase();
  if (!host || PRODUCTION_HOSTS.has(host)) return false;
  if (host.includes("-git-")) return true;
  return /(?:^|\.)[\w-]+-git-[\w.-]+\.vercel\.app$/.test(host);
}

export function reachabilityMessage(hostname = currentHostname()): string {
  return isPreviewHost(hostname) ? PREVIEW_UNREACHABLE : PRODUCTION_UNREACHABLE;
}

export function unexpectedResponseMessage(hostname = currentHostname()): string {
  return isPreviewHost(hostname) ? PREVIEW_UNREACHABLE : UNEXPECTED_RESPONSE;
}

export function looksLikeAuthWall(res: Response, body = ""): boolean {
  if (isGatewayStatus(res.status) || looksLikePayloadTooLarge(res, body)) return false;
  const type = res.headers.get("content-type") || "";
  if (/text\/html|application\/xhtml/i.test(type)) return true;
  const url = res.url || "";
  if (/vercel\.com\/sso|\/sso-api|_vercel\/sso/i.test(url)) return true;
  return /<!doctype html|<html[\s>]|Sign in to Vercel|Authentication Required|vercel-sso/i.test(
    body,
  );
}

export function explainClientFetchError(error: unknown, hostname = currentHostname()): string {
  const message = error instanceof Error ? error.message : "";
  if (
    message === PREVIEW_UNREACHABLE ||
    message === PRODUCTION_UNREACHABLE ||
    message === UNEXPECTED_RESPONSE ||
    message === PHOTO_TOO_LARGE ||
    message === PHOTO_TOO_LARGE_KEEP
  ) {
    return message;
  }
  if (
    error instanceof TypeError ||
    /failed to fetch|networkerror|network request failed|load failed|fetch failed/i.test(message)
  ) {
    return reachabilityMessage(hostname);
  }
  return message || reachabilityMessage(hostname);
}

export function isReachabilityError(message: string | null | undefined): boolean {
  return (
    message === PREVIEW_UNREACHABLE ||
    message === PRODUCTION_UNREACHABLE ||
    message === UNEXPECTED_RESPONSE
  );
}

export async function readResponsePayload<T>(
  res: Response,
  hostname = currentHostname(),
): Promise<T> {
  const raw = await res.text();
  if (looksLikePayloadTooLarge(res, raw)) {
    throw new Error(PHOTO_TOO_LARGE);
  }
  if (looksLikeAuthWall(res, raw)) {
    throw new Error(unexpectedResponseMessage(hostname));
  }
  try {
    return (raw ? JSON.parse(raw) : {}) as T;
  } catch {
    throw new Error(unexpectedResponseMessage(hostname));
  }
}

export async function readJson<T>(res: Response, hostname = currentHostname()): Promise<T> {
  const data = await readResponsePayload<T & { error?: string }>(res, hostname);
  if (!res.ok) throw new Error(data.error || "Something went sideways.");
  return data;
}
