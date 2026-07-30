# madojs.dev

The public Mado site and a production dogfood project for Mado and Mado UI.
It is intentionally built as a frontend-only static release and deployed with
Cloudflare Workers Static Assets.

## Run locally

```bash
npm install
npm run dev
```

The first public slice contains `/`, `/start`, `/why`, `/proof` and the
catch-all not-found page. Routes are explicit in `src/app.routes.ts`; the
single document shell lives in `src/site-shell.ts`.

## Verify

```bash
npm run verify
npm run release
npm run verify:release
npm run preview
```

`npm run build` checks the live Vite application. `npm run release` additionally
captures every public route in a browser and writes the deployable artifact to
`out/`. The release verifier checks route HTML, canonical metadata, the noindex
404 shell and Cloudflare-safe redirects.

## UI source

Mado UI is managed as copied source:

```bash
npx @madojs/ui@latest doctor
npx @madojs/ui@latest diff
npx @madojs/ui@latest update
```

There is no `@madojs/ui` browser dependency. Site-owned styles are separate
from copied `src/styles/mado-ui-*.css` files.

## Cloudflare

`wrangler.jsonc` deploys `out/` as Workers Static Assets. All current public
routes are static, so unknown URLs use `404.html`; the site intentionally
overrides Mado's generic SPA `_redirects` catch-all.

CI verifies every push and pull request but intentionally has no production
credentials. Production deploys are operator-controlled from an authenticated
workspace. The deploy command requires a clean `main` at the same commit as
`origin/main`, Node 24, no local production `.env` files and no Cloudflare
credentials in the shell. It installs the locked dependencies, rebuilds and
verifies the release, records the commit SHA in the deployed artifact and
checks that exact commit on the public edge.

Authenticate once, then deploy:

```bash
npm exec -- wrangler login
npm run deploy
```

For a local edge preview:

```bash
npm run preview:edge
npm run verify:edge # in another terminal
```

Deployment requires an authenticated Cloudflare account and the `madojs.dev`
zone. The non-secret account ID is pinned in `wrangler.jsonc`; authorization is
provided only by the local Wrangler OAuth session. No Cloudflare credentials
are stored in GitHub. A failed post-deploy edge check exits non-zero but does
not automatically roll production back. Architecture decisions and dogfood
findings live in `docs/`.
