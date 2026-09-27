import type { Metadata } from "next";
import { redirect } from "next/navigation";
import ExpireSavedMoments from "@/components/ExpireSavedMoments";
import MomentsCheckout from "@/components/MomentsCheckout";
import SiteFooter from "@/components/SiteFooter";
import { isPersonalPhotoSession } from "@/lib/session";
import { SITE_TITLE } from "@/lib/site-title";

export const metadata: Metadata = {
  title: SITE_TITLE,
  description: "Unlock 25 good moments weaved for R130 ZAR / $7.99.",
  openGraph: { title: SITE_TITLE },
  twitter: { title: SITE_TITLE },
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
            <p className="moments-offer">Unlock 25 good moments weaved for</p>
            <p className="moments-price-hero">
              <span className="moments-price-hero__amount">R130</span>
              <span className="moments-price-hero__unit">ZAR / $7.99</span>
            </p>
          </section>
          <MomentsCheckout />
        </div>
      </main>
      <SiteFooter className="site-footer--moments" />
    </div>
  );
}
