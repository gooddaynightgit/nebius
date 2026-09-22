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
            You scrolled past a hundred good moments today. None of them were yours.
          </h1>
          <span className="card__mark" aria-hidden="true"></span>
          <span className="card__wash card__wash--sun" aria-hidden="true"></span>
        </section>

        <section className="card card--lavender">
          <p className="card__body">
            Your laugh. Your small win. Your quiet moment. Nobody turned them
            into anything — not even you. Gooddaynight does{" "}
            <Link href="/app" aria-label="Open the capture page">
              →
            </Link>
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
            Snap one good moment from your day. Gooddaynight reads it back to
            you as a beautiful story — your own.
          </p>
          <p className="cta-copy">
            One good moment remembered today. More spotted tomorrow. Day by
            day, one moment becomes many.
          </p>
        </section>

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
