import { Suspense } from "react";
import { redirect } from "next/navigation";
import CaptureStudio from "@/components/CaptureStudio";
import { isPersonalPhotoSession } from "@/lib/session";
import { siteTitleMetadata } from "@/lib/site-title";

export const dynamic = "force-dynamic";

export const metadata = siteTitleMetadata;

export default async function AppPage() {
  if (!(await isPersonalPhotoSession())) redirect("/signin");
  return (
    <Suspense fallback={null}>
      <CaptureStudio />
    </Suspense>
  );
}
