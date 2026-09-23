import { NextResponse } from "next/server";
import { normalizeEmail } from "@/lib/identity";
import { checkoutHealth, createCheckout, escapeHtml } from "@/lib/payfast";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const noStore = { "Cache-Control": "no-store" };

export async function GET() {
  return NextResponse.json(checkoutHealth(), { headers: noStore });
}

export async function POST(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";
  const asJson = contentType.includes("application/json");
  const email = await readEmail(request, asJson);
  const result = createCheckout(normalizeEmail(email));
  if (!result.ok) return errorResponse(result.message, result.status, asJson);
  return new NextResponse(result.html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      ...noStore,
    },
  });
}

async function readEmail(request: Request, asJson: boolean): Promise<string> {
  if (asJson) {
    const body = (await request.json().catch(() => null)) as { email?: string } | null;
    return body?.email ?? "";
  }
  const form = await request.formData();
  return String(form.get("email") ?? "");
}

function errorResponse(message: string, status: number, asJson: boolean): NextResponse {
  if (asJson) {
    return NextResponse.json({ error: message }, { status, headers: noStore });
  }
  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8" /><title>Payfast</title></head>
<body><p>${escapeHtml(message)}</p></body>
</html>`;
  return new NextResponse(html, {
    status,
    headers: { "Content-Type": "text/html; charset=utf-8", ...noStore },
  });
}
