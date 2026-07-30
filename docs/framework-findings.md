# Dogfood findings

This log separates framework/library friction from site product work.

## Open

### Cloudflare Workers and the default `_redirects`

`mado release` generates `/* /_mado/spa.html 200` when no `_redirects` file is
present and the release has no explicit host 404. Workers Static Assets
evaluates that rewrite before looking for an asset, so the SPA policy can
shadow captured pages and even JavaScript assets.

The all-static site now dogfoods Mado's literal static wildcard: it produces
`404.html` and suppresses the automatic catch-all without a placeholder
`public/_redirects`. Mado's deployment guide now documents an asset-first
fallback Worker for mixed static/SPA sites; a provider abstraction can wait
until a real application proves that the extra core surface is justified.

Mado also precompresses every text asset and emits an HTML `/*.html` headers
rule. Workers compresses at the edge, so this site excludes `.br` and `.gz`
copies with `.assetsignore`; clean public paths such as `/start` do not match
the generated HTML rule, although Workers' default revalidation policy remains
safe. The site also excludes the path-free `.mado-output` ownership marker
because build metadata is not a public asset. These provider-specific details
belong in a future target-specific release adapter.

### Mado UI repeats satisfied import guidance

Mado UI 0.2 correctly migrated the legacy lock and found all ten copied recipes
unchanged, but `mado-ui update` still printed the complete "Add these imports"
reminder even though `src/main.ts` already imports every file and `doctor`
passes. The message is harmless, but the update path should filter it through
the same resolved-import check used by diagnostics.

## Resolved locally, not hidden

- UI imports are explicit in `src/main.ts`.
- Only the CSS recipes used by the first site slice remain installed.
- The documented local edge workflow previously started Wrangler on its
  default port while the verifier targeted `8791`. `preview:edge` now pins the
  same port as the verification contract.
- Dogfooding exposed that Mado UI could not distinguish requested roots from
  transitive dependencies or remove owned source safely. Mado UI 0.2 adds lock
  format 2, an explicit no-guessing migration and a dry-runnable `remove` that
  protects customized files, shared dependencies and transaction boundaries.
- The UI registry now ships a complete 42-item reference and three guides as a
  separately verified Cloudflare artifact at `ui.madojs.dev`; the framework
  site links to that source of truth instead of maintaining parallel UI docs.
- The site shell owns brand and editorial styling rather than stretching a UI
  application-shell template into a marketing layout.
- Mado 0.15 aligns the default and modular starter descriptions: the universal
  starter is canonical and the modular starter remains an optional architecture
  experiment.
- Framework documentation is generated from the exact installed Mado package
  instead of copied into this repository. Mado 0.15 supplies the versioned
  navigation manifest needed to make that boundary deterministic.
- Mado 0.15.2 publicly exports `./package.json`, so the generator and release
  verifier resolve package identity and version without depending on the
  physical npm layout.
- Mado 0.15.2 reduces `.mado-output` to an owner-only marker. Absolute
  build-machine paths can no longer leak into a deployable artifact; the site
  still excludes the internal marker from the Cloudflare upload.
- Dogfooding caught non-portable backslash-escaped backticks in framework
  Markdown and AI instruction assets. Mado 0.15.2 fixes the published text and
  adds a CommonMark-aware lint regression.
- `/llms.txt` is copied byte-for-byte from the installed package and checked in
  the release artifact. The website no longer carries an independently edited
  LLM guide that can lag behind the framework release.
