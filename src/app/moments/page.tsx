import type { Metadata } from "next";
import { redirect } from "next/navigation";
import MomentsCheckout from "@/components/MomentsCheckout";
import SiteFooter from "@/components/SiteFooter";
import { isPersonalPhotoSession } from "@/lib/session";

export const metadata: Metadata = {
  title: "My saved joy moments — GoodDayNight",
  description: "Unlock 40 good moments weaved for R450 ZAR / $28.",
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
        <section className="moments-glass" aria-labelledby="moments-weave">
          <h1 id="moments-weave">My saved joy moments</h1>
          <p className="moments-offer">Unlock 40 good moments weaved for</p>
          <p className="moments-price-hero">
            <span className="moments-price-hero__amount">R450</span>
            <span className="moments-price-hero__unit">ZAR / $28</span>
          </p>
          <MomentsCheckout />
        </section>
      </main>
      <SiteFooter className="site-footer--moments" />
    </div>
  );
}
