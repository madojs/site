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

```bash
npm run preview:edge
npm run verify:edge # in another terminal
npm run deploy
```

Deployment requires an authenticated Cloudflare account and the `madojs.dev`
zone. Architecture decisions and dogfood findings live in `docs/`.
