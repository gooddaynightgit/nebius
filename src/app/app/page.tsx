import CaptureStudio from "@/components/CaptureStudio";
import { readOtpSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function AppPage() {
  const otp = await readOtpSession();
  return <CaptureStudio initialSignedIn={Boolean(otp)} />;
}
