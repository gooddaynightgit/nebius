import { NextResponse } from "next/server";

export function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

export function badRequest(message: string) {
  return json({ error: message }, 400);
}

export function forbidden(message: string) {
  return json({ error: message }, 403);
}

export function unauthorized(message: string) {
  return json({ error: message }, 401);
}

export function notFound(message: string, extra?: Record<string, unknown>) {
  return json({ error: message, code: "expired", ...extra }, 404);
}
