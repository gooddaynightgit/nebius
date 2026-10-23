import { Suspense } from "react";
import { redirect } from "next/navigation";
import CaptureStudio from "@/components/CaptureStudio";
import { isPersonalPhotoSession } from "@/lib/session";
import { NOINDEX, siteTitleMetadata } from "@/lib/site-title";

export const dynamic = "force-dynamic";

export const metadata = { ...siteTitleMetadata, robots: NOINDEX };

export default async function AppPage() {
  if (!(await isPersonalPhotoSession())) redirect("/signin");
  return (
    <Suspense fallback={null}>
      <CaptureStudio />
    </Suspense>
  );
}
