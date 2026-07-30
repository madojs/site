# 0001 — Public site contract

Status: accepted

## Decision

`madojs.dev` is an executable specification of Mado rather than a generic
marketing landing page. The first release contains four public routes and an
honest not-found state:

- `/` — the product promise;
- `/start` — the shortest verified path to a running project;
- `/why` — scope and trade-offs;
- `/proof` — inspectable evidence behind the claims;
- `*` — a noindex not-found page.

Every public route is described with `page({ static: true })`. Mado captures the
same templates used by the live router, so the release artifact contains useful
HTML before JavaScript and performs an atomic SPA takeover after boot.

## Architecture

- The canonical universal starter is the baseline.
- `src/app.routes.ts` is the explicit URL manifest.
- `src/site-shell.ts` owns the single header, main landmark and footer.
- Route modules own page copy and semantic sections, but never another `<main>`.
- Mado UI contributes copied CSS recipes. Site-specific layout remains local.
- Marketing copy lives here. Framework reference and UI catalog content do not.
- The browser is the only application runtime. Cloudflare serves static assets.

## Deployment

The first release uses Cloudflare Workers Static Assets in static-site mode:

- `out/` is the upload directory;
- HTML uses canonical paths without trailing slashes;
- unknown paths use the generated `404.html`;
- Mado's generic SPA catch-all is intentionally suppressed for this all-static
  site because Workers applies `_redirects` before asset lookup.

If a real SPA-only route is added later, deployment must move to an asset-first
fallback Worker that serves `/_mado/spa.html` only for missing HTML navigation
requests. It must never turn missing scripts or images into HTML.

## Dependency policy

Application runtime dependencies stay limited to Mado. Build and verification
tools may be added when they produce a concrete release guarantee. UI source is
owned by this repository after the CLI copies it.

## Consequences

This site deliberately exercises routing, head metadata, static capture,
navigation focus, copied UI source and Cloudflare packaging. Any friction found
in those paths becomes input to Mado or Mado UI instead of permanent local
workarounds.
