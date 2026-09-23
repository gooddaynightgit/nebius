import Link from "next/link";

export default function HomePage() {
  return (
    <div className="page">
      <header className="site-header">
        <Link className="badge" href="/">
          gooddaynight.com
        </Link>
      </header>

      <main id="main">
        <section className="card card--mint" aria-labelledby="hero-heading">
          <h1 id="hero-heading">
            Gooddaynight: an app that trains you to hunt one good moment a day, capture it in seconds, and lets the habit of looking rewire how you feel.
          </h1>
          <span className="card__mark" aria-hidden="true"></span>
          <span className="card__wash card__wash--sun" aria-hidden="true"></span>
        </section>

        <section className="card card--dark card--compact" aria-labelledby="cta-heading">
          <h2 id="cta-heading" className="visually-hidden">
            Hear your story
          </h2>
          <Link className="btn btn--lime" href="/app/joy">
            Hear your story — free
          </Link>
        </section>

        <nav className="step-nav" aria-label="Steps">
          <span className="step-arrow step-arrow--spacer" aria-hidden="true"></span>
          <Link className="step-arrow" href="/app/joy" aria-label="Next step">
            →
          </Link>
        </nav>

        <section className="card card--lime" aria-labelledby="closing-heading">
          <h2 id="closing-heading">Something good is about to happen!</h2>
        </section>
      </main>

      <footer className="site-footer">
        <p>
          Looking forward to hearing from you:
          <br />
          <a href="mailto:hello@gooddaynight.com">hello@gooddaynight.com</a>
        </p>
      </footer>
    </div>
  );
}
