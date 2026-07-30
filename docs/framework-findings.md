# Dogfood findings

This log separates framework/library friction from site product work.

## Open

### Mado starter positioning is inconsistent

The generated universal starter README describes the modular starter as the
reference architecture for long-lived business applications. Mado's current
maturity roadmap describes it as an optional architecture experiment. Those two
contracts should agree, especially because both people and coding agents treat
starter text as product guidance.

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
safe. Both details belong in a future target-specific release adapter.

The release artifact also contains `.mado-output`, an ownership marker whose
`projectRoot` is an absolute build-machine path. Wrangler treats it as a public
asset unless the project excludes it. This site adds `.mado-output` to
`.assetsignore` and verifies the rule; Mado should eventually keep internal
artifact metadata outside the public asset tree or exclude it by default.

### Mado UI has no remove command

The CLI can initialize, add, update, diff and diagnose copied items, but it
cannot remove an installed item and update the lockfile. Open-code ownership
makes manual deletion possible, yet a guarded `remove` command would make
experimentation and dependency-closure cleanup less error-prone.

## Resolved locally, not hidden

- UI imports are explicit in `src/main.ts`.
- Only the CSS recipes used by the first site slice remain installed.
- The site shell owns brand and editorial styling rather than stretching a UI
  application-shell template into a marketing layout.
