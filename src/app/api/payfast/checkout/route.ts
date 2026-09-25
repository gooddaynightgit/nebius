import { NextResponse } from "next/server";
import { normalizeEmail } from "@/lib/identity";
import { otpAllowsEmail } from "@/lib/otp-session";
import { checkoutHealth, createCheckout, escapeHtml } from "@/lib/payfast";
import { readOtpSession } from "@/lib/session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const noStore = { "Cache-Control": "no-store" };

export async function GET() {
  return NextResponse.json(checkoutHealth(), { headers: noStore });
}

export async function POST(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";
  const asJson = contentType.includes("application/json");
  const otp = await readOtpSession();
  const email = normalizeEmail(otp?.email ?? "");
  if (!otpAllowsEmail(otp, email)) {
    return errorResponse("Verify the code we emailed you before checkout.", 403, asJson);
  }
  const result = createCheckout(email);
  if (!result.ok) return errorResponse(result.message, result.status, asJson);
  return new NextResponse(result.html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      ...noStore,
    },
  });
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
