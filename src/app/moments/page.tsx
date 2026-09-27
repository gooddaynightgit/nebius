import type { Metadata } from "next";
import { redirect } from "next/navigation";
import ExpireSavedMoments from "@/components/ExpireSavedMoments";
import MomentsCheckout from "@/components/MomentsCheckout";
import SiteFooter from "@/components/SiteFooter";
import { isPersonalPhotoSession } from "@/lib/session";

export const metadata: Metadata = {
  title: "My new joy moments — GoodDayNight",
  description: "One price. $7.99 / R130. Unlock 25 good moments weaved.",
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

      <ExpireSavedMoments />
      <main id="main" className="moments-stage">
        <div className="moments-stack">
          <h1 className="moments-page-heading">My new joy moments</h1>
          <section className="moments-glass" aria-labelledby="moments-weave">
            <h2 id="moments-weave">Every good moment weaved adds to the rich tapestry of life</h2>
            <p className="moments-offer">One price. Unlock 25 good moments weaved.</p>
            <p className="moments-price-hero">
              <span className="moments-price-hero__amount">$7.99</span>
              <span className="moments-price-hero__unit">/ R130</span>
            </p>
          </section>
          <MomentsCheckout />
        </div>
      </main>
      <SiteFooter className="site-footer--moments" />
    </div>
  );
}
