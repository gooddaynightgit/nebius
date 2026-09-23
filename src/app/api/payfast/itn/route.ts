import { NextResponse } from "next/server";
import { handlePayfastItn } from "@/lib/payfast";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const headers = {
  "Content-Type": "text/plain; charset=utf-8",
  "Cache-Control": "no-store",
};

/** Payfast server notify. No CORS — this is not a browser endpoint. */
export async function POST(request: Request) {
  const raw = await request.text();
  const result = await handlePayfastItn(raw);
  return new NextResponse(result.body, { status: result.status, headers });
}
