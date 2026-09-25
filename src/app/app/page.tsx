import { redirect } from "next/navigation";
import CaptureStudio from "@/components/CaptureStudio";
import { isPersonalPhotoSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function AppPage() {
  if (!(await isPersonalPhotoSession())) redirect("/signin");
  return <CaptureStudio />;
}
