# Mado site working contract

This repository is the public site for Mado. It is also a production
dogfood project for the framework and Mado UI.

## Product boundary

- Build a frontend, not a backend or a meta-framework.
- Keep every public route statically capturable with `mado release`.
- Use explicit authored routes and generated documentation routes. Internal
  links use `routeUrl()` and `data-link`.
- Add source-owned route loaders to `src/authored-routes.ts`;
  `src/app.routes.ts` combines that map with generated documentation and the
  wildcard fallback.
- Keep one shared site shell and one `<main data-mado-focus>` landmark.
- Do not add SSR, server actions, authentication or API routes here.

## Ownership

- Mado owns components, pages, routing, signals and the release pipeline.
- Mado UI files are copied into `src/styles/`; there is no UI runtime package.
- This repository owns its shell, brand treatment, copy and editorial layout.
- Long-form framework reference material and its navigation manifest stay in
  the Mado package. Do not fork their copy or ordering into this repository.
- `src/generated/docs/` is derived from the exact installed Mado package. Edit
  the generator, authored route map, UI lock or upstream documentation, never
  generated modules and proof rows by hand.
- Root `llms.txt` and public `/llms.txt` must remain byte-identical to the
  installed package file. Use `npm run docs:update` after an intentional Mado
  version change.
- The UI catalog stays in the Mado UI repository and will ship separately.

## Design

- Use neutral OKLCH colors with a restrained blue brand accent.
- Prefer typography, whitespace and thin borders over decorative effects.
- Use semantic HTML and native browser behavior before custom interaction.
- Respect reduced motion, forced colors, keyboard navigation and narrow screens.
- Do not add a runtime dependency for something the browser already provides.

## Quality gates

Before committing a meaningful slice, run:

```bash
npm run verify
npm test
npm run release
npm run verify:release
```

Record framework or UI friction in `docs/framework-findings.md`. Do not hide a
product problem behind site-specific magic without documenting it.
