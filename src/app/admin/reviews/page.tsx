import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { AdminReviewList, AdminUnlock } from "@/components/AdminReviews";
import SiteFooter from "@/components/SiteFooter";
import { ADMIN_COOKIE, ADMIN_TOKEN_HINT, adminConfigured, adminCookieMatches } from "@/lib/review-admin";
import { listAdminReviews } from "@/lib/review";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Reviews — GoodDayNight",
  robots: { index: false, follow: false },
};

export default async function AdminReviewsPage() {
  const configured = adminConfigured();
  const jar = await cookies();
  const open = configured && adminCookieMatches(jar.get(ADMIN_COOKIE)?.value);
  const reviews = open ? await listAdminReviews() : [];

  return (
    <div className="page review-page">
      <header className="site-header">
        <Link className="badge" href="/">
          GoodDayNight
        </Link>
      </header>
      <main id="main">
        <section className="card card--lavender card--compact" aria-labelledby="admin-reviews-heading">
          <h1 id="admin-reviews-heading">Reviews</h1>
          {configured ? null : <p className="card__body">{ADMIN_TOKEN_HINT}</p>}
          {configured && !open ? <AdminUnlock /> : null}
          {open ? <AdminReviewList reviews={reviews} /> : null}
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
