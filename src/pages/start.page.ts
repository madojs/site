import { html, page, routeUrl } from "@madojs/mado";

import { codeExample } from "../lib/code-example";
import "../styles/start.css";

const quickstart = `npm exec --yes --package @madojs/mado@latest -- mado init my-app
cd my-app
npm install
npm run dev`;

const release = `npm run release
npm run preview`;

const componentExample = `import { component, html } from "@madojs/mado";

component("hello-card", (ctx) => {
  const name = ctx.attr("name", "world");
  return html\`<p>Hello, \${() => name()}.</p>\`;
});`;

const pageExample = `import { html, page } from "@madojs/mado";

export default page({
  static: true,
  title: "Home",
  view: () => html\`<article>...</article>\`,
});`;

const routeExample = `import { routes } from "@madojs/mado";

export default routes({
  "/": () => import("./pages/home.page"),
  "*": () => import("./pages/not-found.page"),
});`;

export default page({
  static: true,
  title: "Start",
  head: () => ({
    description:
      "Create a Mado project, understand its three contracts and build a browser-rendered static release.",
    og: {
      title: "Start with Mado",
      description:
        "From an empty directory to a running Mado app.",
      type: "article",
    },
  }),
  view: () => html`
    <article class="site-page site-editorial">
      <header class="mado-ui-page-header site-container site-page-header">
        <div class="mado-ui-page-header-heading">
          <p class="mado-ui-page-header-eyebrow">Quickstart</p>
          <h1 class="mado-ui-page-header-title">
            From an empty directory to a running Mado app.
          </h1>
          <p class="mado-ui-page-header-description">
            Use the published CLI, inspect the generated TypeScript, and ship
            the same application as useful HTML plus a live browser app.
          </p>
        </div>
        <div class="mado-ui-page-header-actions">
          <a
            class="mado-ui-button"
            data-variant="secondary"
            href="https://github.com/madojs/mado"
          >
            View source
          </a>
        </div>
      </header>

      <section class="site-container editorial-section" aria-labelledby="start-run-title">
        <div class="editorial-step">
          <span>01</span>
          <div>
            <p class="site-eyebrow">Create and run</p>
            <h2 id="start-run-title">Four commands, one ordinary project.</h2>
          </div>
        </div>
        <p class="editorial-lead">
          The CLI copies a small Vite application. After that, the project is
          yours: there is no remote generator state and no hosted runtime to
          keep alive.
        </p>
        ${codeExample({ label: "Terminal", code: quickstart })}
        <p class="editorial-note">
          The explicit <code class="mado-ui-code">@latest</code> makes initial
          scaffolding use the current CLI. Your generated project records a
          normal semver dependency in <code class="mado-ui-code">package.json</code>.
        </p>
      </section>

      <section class="site-container editorial-section" aria-labelledby="start-map-title">
        <div class="editorial-step">
          <span>02</span>
          <div>
            <p class="site-eyebrow">Read the project</p>
            <h2 id="start-map-title">The important files fit in one view.</h2>
          </div>
        </div>
        <div class="start-file-map">
          <pre class="mado-ui-code-block" tabindex="0"><code>src/
  main.ts
  app.routes.ts
  pages/
    home.page.ts
    not-found.page.ts
  components/
  styles/</code></pre>
          <dl>
            <div>
              <dt><code class="mado-ui-code">main.ts</code></dt>
              <dd>Imports global source and mounts the shared application tree.</dd>
            </div>
            <div>
              <dt><code class="mado-ui-code">app.routes.ts</code></dt>
              <dd>Maps explicit URL patterns to lazy page modules.</dd>
            </div>
            <div>
              <dt><code class="mado-ui-code">pages/</code></dt>
              <dd>Owns route data, metadata, static intent and view.</dd>
            </div>
            <div>
              <dt><code class="mado-ui-code">components/</code></dt>
              <dd>Contains autonomous Web Components when a boundary earns one.</dd>
            </div>
          </dl>
        </div>
      </section>

      <section class="editorial-section start-contracts" aria-labelledby="start-contracts-title">
        <div class="site-container">
          <div class="editorial-step">
            <span>03</span>
            <div>
              <p class="site-eyebrow">Learn three contracts</p>
              <h2 id="start-contracts-title">
                Component, page and route are enough to orient the app.
              </h2>
            </div>
          </div>
          <div class="start-code-grid">
            ${codeExample({
              label: "Component · hello-card.component.ts",
              code: componentExample,
              language: "typescript",
            })}
            ${codeExample({
              label: "Page · home.page.ts",
              code: pageExample,
              language: "typescript",
            })}
            ${codeExample({
              label: "Routes · app.routes.ts",
              code: routeExample,
              language: "typescript",
            })}
          </div>
        </div>
      </section>

      <section class="site-container editorial-section" aria-labelledby="start-release-title">
        <div class="editorial-step">
          <span>04</span>
          <div>
            <p class="site-eyebrow">Build the real artifact</p>
            <h2 id="start-release-title">
              Release, then inspect it like a static host.
            </h2>
          </div>
        </div>
        <div class="start-release-grid">
          <div>
            <p class="editorial-lead">
              Mado typechecks, builds the SPA, captures declared static routes
              in a real browser, generates deployment metadata and writes
              everything to <code class="mado-ui-code">out/</code>.
            </p>
            <ul class="site-check-list">
              <li>Open pages with JavaScript disabled.</li>
              <li>Navigate again with JavaScript enabled.</li>
              <li>Inspect canonical URLs, sitemap and the 404 shell.</li>
            </ul>
          </div>
          ${codeExample({ label: "Production artifact", code: release })}
        </div>
      </section>

      <section class="site-container site-final-cta" aria-labelledby="start-next-title">
        <p class="site-eyebrow">Next decision</p>
        <h2 id="start-next-title">Know the boundary before adding structure.</h2>
        <p>
          Mado intentionally stops at the browser. See where it fits—and where
          a different tool is the more honest choice.
        </p>
        <a
          class="mado-ui-button"
          data-size="large"
          data-link
          href=${routeUrl("/why")}
        >
          Why Mado
        </a>
      </section>
    </article>
  `,
});
