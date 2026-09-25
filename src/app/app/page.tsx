import CaptureStudio from "@/components/CaptureStudio";
import { isPersonalPhotoSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function AppPage() {
  const signedIn = await isPersonalPhotoSession();
  return <CaptureStudio signedIn={signedIn} />;
}
