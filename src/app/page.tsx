import Link from "next/link";
import SiteFooter from "@/components/SiteFooter";
import { STEP_LABEL } from "@/lib/journey";

export default function HomePage() {
  return (
    <div className="page">
      <header className="site-header">
        <Link className="badge" href="/">
          GoodDayNight
        </Link>
      </header>

      <main id="main">
        <section className="card card--mint" aria-labelledby="hero-heading">
          <h1 id="hero-heading">
            You scrolled past a hundred good moments today. None of them were yours.
          </h1>
          <span className="card__mark" aria-hidden="true"></span>
          <span className="card__wash card__wash--sun" aria-hidden="true"></span>
        </section>

        <section className="card card--lavender">
          <p className="card__body">
            Your laugh. Your small win. Your quiet moment. Nobody turned them
            into anything — not even you.
          </p>
          <span className="card__wash card__wash--ten" aria-hidden="true"></span>
        </section>

        <nav className="step-nav" aria-label={STEP_LABEL.start}>
          <Link className="step-next" href="/app/joy">
            {STEP_LABEL.start}
          </Link>
        </nav>

        <video
          className="landing-demo"
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          poster="/landing-demo-poster.jpg"
          src="/landing-demo.mp4"
          width={720}
          height={1198}
          aria-label="Demo of weaving a good moment"
        />

        <section className="card card--lime" aria-labelledby="closing-heading">
          <h2 id="closing-heading">Something good is about to happen!</h2>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
