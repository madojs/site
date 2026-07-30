# madojs.dev

The public Mado site and a production dogfood project for Mado and Mado UI.
It is intentionally built as a frontend-only static release and deployed with
Cloudflare Workers Static Assets.

## Run locally

```bash
npm install
npm run dev
```

The public surface contains `/`, `/start`, `/why`, `/proof`, the complete
version-matched Mado documentation under `/docs`, `/llms.txt` and the catch-all
not-found page. The source-owned authored route map lives in
`src/authored-routes.ts` and meets generated routes in `src/app.routes.ts`; the
single document shell lives in `src/site-shell.ts`.

Documentation is compiled from the exact `@madojs/mado` version installed by
the lockfile. Mado owns the Markdown and its navigation manifest; this
repository owns the renderer and visual shell. The generated release manifest
and route modules come from that same validated source: route modules drive
Mado's static discovery, while the release manifest drives verification. The
generator also emits the proof-page rows from those routes, the exact installed
Mado package and the tracked Mado UI lock. The site does not maintain a second
hand-written documentation index or route-count display.

To regenerate from the current lockfile or intentionally accept the `llms.txt`
copy after a framework update:

```bash
npm run docs:sync
npm run docs:update
```

Normal application commands run the strict sync and fail if the tracked
`llms.txt` has drifted. `docs:update` is the explicit dependency-update path;
generated TypeScript and the public copy remain disposable build artifacts.

## Verify

```bash
npm run verify
npm run release
npm run verify:release
npm run preview
```

The npm lifecycle regenerates documentation before application commands.
`npm run build` checks the live Vite application. `npm run release`
additionally captures every public route in a browser and writes the deployable
artifact to `out/`. The release verifier checks every generated documentation
route, exact headings and metadata, the sitemap, package provenance for
`llms.txt`, the noindex 404 shell and Cloudflare-safe packaging.

## UI source

Mado UI is managed as copied source:

```bash
npx @madojs/ui@latest doctor
npx @madojs/ui@latest diff
npx @madojs/ui@latest update
npx @madojs/ui@latest remove <explicit-item> --dry-run
```

There is no `@madojs/ui` browser dependency. Site-owned styles are separate
from copied `src/styles/mado-ui-*.css` files. Lock format 2 records explicit
installation roots and their captured dependency edges. A legacy lock must be
migrated with its original roots before any mutating command; the CLI never
guesses ownership.

## Cloudflare

`wrangler.jsonc` deploys `out/` as Workers Static Assets. All current public
routes are static, so the static wildcard produces `404.html` and Mado omits
its generic SPA `_redirects` catch-all.

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
