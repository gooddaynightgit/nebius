import Link from "next/link";

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
          <h1 id="hero-heading">
            You scrolled past a hundred good moments today. None of them were yours.
          </h1>
          <span className="card__mark" aria-hidden="true"></span>
          <span className="card__wash card__wash--sun" aria-hidden="true"></span>
        </section>

        <section className="card card--lavender">
          <p className="card__body">
            Your own day — the laugh, the small win, the quiet moment — nobody
            turned it into anything. Not even you. Gooddaynight does.
          </p>
          <span className="card__wash card__wash--ten" aria-hidden="true"></span>
        </section>

        <section className="card card--dark" aria-labelledby="cta-heading">
          <span className="pill">Tonight</span>
          <h2 id="cta-heading" className="visually-hidden">
            Hear your story
          </h2>
          <Link className="btn btn--lime" href="/app">
            Hear your story — free
          </Link>
          <p className="cta-copy">
            Drop a voice, a photo, or a note. Email only after your first moment
            — then you can hear your own good-moments story.
          </p>
        </section>

        <section className="card card--cream">
          <p className="card__body">
            It takes what you texted, photographed, or voice-noted today — and
            reads your own good moments back to you as a bedtime story.
          </p>
          <span className="card__wash card__wash--note" aria-hidden="true"></span>
        </section>

        <section className="card card--peach" aria-labelledby="prime-heading">
          <h2 id="prime-heading">
            Remembering even one of your own good moments today primes you to spot more tomorrow.
          </h2>
          <span className="card__wash card__wash--plus" aria-hidden="true"></span>
        </section>

        <section className="card card--cyan" aria-labelledby="multifold-heading">
          <h2 id="multifold-heading">
            With time, naturally your own good moments unfolds — your own good moments
            multifolds
          </h2>
          <span className="card__wash card__wash--fold" aria-hidden="true"></span>
        </section>

        <section className="card card--lime" aria-labelledby="closing-heading">
          <h2 id="closing-heading">Something good is about to happen!</h2>
        </section>
      </main>

      <footer className="site-footer">
        <p>
          <a href="https://gooddaynight.com">Gooddaynight.com</a>
        </p>
      </footer>
    </div>
  );
}
