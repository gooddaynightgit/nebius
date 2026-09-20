# Gooddaynight

Single-page marketing site for [Gooddaynight.com](https://gooddaynight.com).

Gooddaynight turns what you texted, photographed, or voice-noted during the day into a bedtime story read back to you.

The landing page is a stacked colour-block layout (pastel gradient cards, lime brand badge, one punchy dark CTA card), designed mobile-first.

## Preview locally

From the repository root:

```bash
python3 -m http.server 4173
```

Then open [http://localhost:4173](http://localhost:4173).

Any static file server works (`npx serve`, Caddy, nginx). There is no build step.

## Signup form

The email capture is client-side only for now. A valid email shows **You're on the list** and is stored in `localStorage`. Wire the form in `main.js` to a provider (Buttondown, Mailchimp, ConvertKit, a small API) when you are ready.

## Point gooddaynight.com here

Publish the repository root as a static site, then attach the domain.

### GitHub Pages

1. Repo **Settings → Pages**
2. Source: deploy from branch `main`, folder `/` (root)
3. Add a `CNAME` file in the root containing `gooddaynight.com`
4. At your DNS host, point `gooddaynight.com` (and `www` if you use it) to GitHub Pages

### Vercel, Netlify, or Cloudflare Pages

1. Import this repository
2. Framework preset: none
3. Publish directory: repository root
4. Add `gooddaynight.com` as a custom domain in the host dashboard and follow their DNS instructions

## Stack

Static HTML, CSS, and a small JavaScript file. Apache 2.0 license.
