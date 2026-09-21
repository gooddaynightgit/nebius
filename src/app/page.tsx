import Link from "next/link";
import MomentAccordion from "@/components/MomentAccordion";
import { LANDING } from "@/lib/landing";

export default function HomePage() {
  return (
    <div className="page">
      <header className="site-header">
        <Link className="badge" href="/">
          Gooddaynight
        </Link>
      </header>

      <main id="main">
        <section className="card card--mint" aria-labelledby="hero-heading">
          <h1 id="hero-heading">{LANDING.hero.h1}</h1>
          <span className="card__mark" aria-hidden="true"></span>
          <span className="card__wash card__wash--sun" aria-hidden="true"></span>
        </section>

        <section className="card card--lavender">
          <p className="card__body">{LANDING.hero.subheadline}</p>
          <span className="card__wash card__wash--ten" aria-hidden="true"></span>
        </section>

        <section className="card card--dark" aria-labelledby="cta-heading">
          <span className="pill">Tonight</span>
          <h2 id="cta-heading" className="visually-hidden">
            Hear your story
          </h2>
          <Link className="btn btn--lime" href="/app">
            {LANDING.hero.cta}
          </Link>
          <p className="cta-copy">{LANDING.hero.microcopy[0]}</p>
          <p className="cta-copy">{LANDING.hero.microcopy[1]}</p>
        </section>

        <MomentAccordion />

        <section className="card card--peach" aria-labelledby="change-heading">
          <h2 id="change-heading">{LANDING.footer.changePicture}</h2>
          <span className="card__wash card__wash--plus" aria-hidden="true"></span>
        </section>

        <section className="card card--cyan" aria-labelledby="one-heading">
          <h2 id="one-heading">{LANDING.footer.oneMoment}</h2>
          <span className="card__wash card__wash--fold" aria-hidden="true"></span>
        </section>

        <section className="card card--lime" aria-labelledby="closing-heading">
          <h2 id="closing-heading">{LANDING.footer.somethingGood}</h2>
        </section>
      </main>

      <footer className="site-footer">
        <p>
          <a href="https://gooddaynight.com">{LANDING.footer.site}</a>
        </p>
      </footer>
    </div>
  );
}
