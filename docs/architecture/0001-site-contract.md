# 0001 — Public site contract

Status: accepted

## Decision

`madojs.dev` is an executable specification of Mado rather than a generic
marketing landing page. Its public surface combines four authored routes with
the documentation shipped by the exact installed framework package:

- `/` — the product promise;
- `/start` — the shortest verified path to a running project;
- `/why` — scope and trade-offs;
- `/proof` — inspectable evidence behind the claims;
- `/docs` — the site-owned documentation entry point;
- `/docs/<slug>` — package-owned, statically captured reference documents;
- `/llms.txt` — a byte-identical copy of the installed package artifact;
- `*` — a noindex not-found page.

Every public route is described with `page({ static: true })`. Mado captures the
same templates used by the live router, so the release artifact contains useful
HTML before JavaScript and performs an atomic SPA takeover after boot.

## Architecture

- The canonical universal starter is the baseline.
- `src/app.routes.ts` combines explicit authored URLs with generated,
  individually lazy documentation pages.
- `src/site-shell.ts` owns the single header, main landmark and footer.
- Route modules own page copy and semantic sections, but never another `<main>`.
- Mado UI contributes copied CSS recipes. Site-specific layout remains local.
- Marketing copy and the documentation renderer live here. Framework reference
  Markdown, its section ordering and its canonical `llms.txt` live in Mado.
- The browser is the only application runtime. Cloudflare serves static assets.

## Documentation pipeline

The lockfile pins one `@madojs/mado` version. Before development, checks and
release, a local build script resolves that installed package and validates its
versioned `docs/en/manifest.json`. It compiles trusted Markdown with a
build-only parser into generated TypeScript modules, rewrites package-internal
links to public documentation routes and copies `llms.txt` without editing it.

The generator emits route modules and a release manifest from one validated
package source. Application routing and Mado's static discovery consume the
route modules; release and edge verification consume the manifest with
framework provenance, every public documentation route, exact metadata and
expected headings. Generated files are disposable build products and are never
an editorial source.

## Deployment

The first release uses Cloudflare Workers Static Assets in static-site mode:

- `out/` is the upload directory;
- HTML uses canonical paths without trailing slashes;
- unknown paths use the generated `404.html`;
- the static wildcard makes Mado omit its generic SPA catch-all because
  Workers applies `_redirects` before asset lookup.

If a real SPA-only route is added later, deployment must move to an asset-first
fallback Worker that serves `/_mado/spa.html` only for missing HTML navigation
requests. It must never turn missing scripts or images into HTML.

## Dependency policy

Application runtime dependencies stay limited to Mado. The Markdown compiler is
a build-only dependency and does not enter the browser runtime. Build and
verification tools may be added when they produce a concrete release guarantee.
UI source is owned by this repository after the CLI copies it.

## Consequences

This site deliberately exercises routing, lazy route modules, package-owned
content, head metadata, static capture at documentation scale, navigation
focus, copied UI source and Cloudflare packaging. A framework release and its
published documentation cannot silently drift on the site: changing the
installed package regenerates both from one source. Any friction found in those
paths becomes input to Mado or Mado UI instead of permanent local workarounds.
