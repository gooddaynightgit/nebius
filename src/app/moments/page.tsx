import type { Metadata } from "next";
import { redirect } from "next/navigation";
import MomentsCheckout from "@/components/MomentsCheckout";
import SiteFooter from "@/components/SiteFooter";
import { isPersonalPhotoSession } from "@/lib/session";

export const metadata: Metadata = {
  title: "My new joy moments — GoodDayNight",
  description: "Unlock 25 good moments weaved for R16 ZAR / $0.88.",
};

export const dynamic = "force-dynamic";

export default async function MomentsPage() {
  if (!(await isPersonalPhotoSession())) redirect("/signin");

  return (
    <div className="moments-page">
      <div className="moments-silk" aria-hidden="true">
        <picture>
          <source srcSet="/weave-silk-1.webp" type="image/webp" />
          <img src="/weave-silk-1.jpg" alt="" />
        </picture>
      </div>

      <main id="main" className="moments-stage">
        <div className="moments-stack">
          <h1 className="moments-page-heading">My new joy moments</h1>
          <section className="moments-glass" aria-labelledby="moments-weave">
            <h2 id="moments-weave">Every good moment weaved adds to the rich tapestry of life</h2>
            <p className="moments-offer">Unlock 25 good moments weaved for</p>
            <p className="moments-price-hero">
              <span className="moments-price-hero__amount">R16</span>
              <span className="moments-price-hero__unit">ZAR / $0.88</span>
            </p>
          </section>
          <MomentsCheckout />
        </div>
      </main>
      <SiteFooter className="site-footer--moments" />
    </div>
  );
}
