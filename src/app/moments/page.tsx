import type { Metadata } from "next";
import { redirect } from "next/navigation";
import MomentsCheckout from "@/components/MomentsCheckout";
import { isPersonalPhotoSession } from "@/lib/session";

export const metadata: Metadata = {
  title: "40 good moments — GoodDayNight",
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
          <h1 id="moments-weave">Every good moment weaved adds to the rich tapestry of life</h1>
          <p className="moments-offer">Unlock 40 good moments weaved for</p>
          <p className="moments-price-hero">
            <span className="moments-price-hero__amount">R450</span>
            <span className="moments-price-hero__unit">ZAR / $28</span>
          </p>
          <MomentsCheckout />
        </section>
      </main>
    </div>
  );
}
