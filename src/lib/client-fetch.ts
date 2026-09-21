import { LANDING } from "./landing";

export const PREVIEW_UNREACHABLE = LANDING.app.reach;
export const JOY_NEED = LANDING.app.joyNeed;

export function looksLikeAuthWall(res: Response, body = ""): boolean {
  if (res.type === "opaqueredirect" || res.redirected) return true;
  const type = res.headers.get("content-type") || "";
  if (/text\/html|application\/xhtml/i.test(type)) return true;
  const url = res.url || "";
  if (/vercel\.com\/sso|\/sso-api|_vercel\/sso/i.test(url)) return true;
  return /<!doctype html|<html[\s>]|Sign in to Vercel|Authentication Required|vercel-sso/i.test(
    body,
  );
}

export function explainClientFetchError(error: unknown): string {
  if (error instanceof Error && error.message === PREVIEW_UNREACHABLE) {
    return PREVIEW_UNREACHABLE;
  }
  const message = error instanceof Error ? error.message : "";
  if (
    error instanceof TypeError ||
    /failed to fetch|networkerror|network request failed|load failed|fetch failed/i.test(message)
  ) {
    return PREVIEW_UNREACHABLE;
  }
  return message || PREVIEW_UNREACHABLE;
}

export async function readResponsePayload<T>(res: Response): Promise<T> {
  const raw = await res.text();
  if (looksLikeAuthWall(res, raw)) {
    throw new Error(PREVIEW_UNREACHABLE);
  }
  try {
    return (raw ? JSON.parse(raw) : {}) as T;
  } catch {
    throw new Error(PREVIEW_UNREACHABLE);
  }
}

export async function readJson<T>(res: Response): Promise<T> {
  const data = await readResponsePayload<T & { error?: string }>(res);
  if (!res.ok) throw new Error(data.error || "Something went sideways.");
  return data;
}
