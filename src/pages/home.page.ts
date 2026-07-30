import { html, page, routeUrl } from "@madojs/mado";

import { codeExample } from "../lib/code-example";
import "../styles/home.css";

const installCommand =
  "npm exec --yes --package @madojs/mado@latest -- mado init my-app";

const contracts = [
  {
    index: "01",
    title: "One component model",
    copy:
      "Standards-based custom elements, open Shadow DOM and fine-grained signals. The component you inspect is the component the browser runs.",
    code: 'component("project-card", () => html`…`)',
  },
  {
    index: "02",
    title: "One page model",
    copy:
      "A page owns its data, metadata and view. The same route can become useful HTML at release time and a live SPA after boot.",
    code: "page({ static: true, head, view })",
  },
  {
    index: "03",
    title: "One release artifact",
    copy:
      "Public pages, the SPA shell, sitemap, canonical metadata and deploy files leave one command as ordinary static assets.",
    code: "npm run release",
  },
] as const;

const capabilities = [
  ["Signals", "Small reactive state without a virtual DOM runtime."],
  ["Routing", "Explicit routes, lazy pages and browser-native navigation."],
  ["Data", "Resources, mutations and invalidation with one lifecycle."],
  ["Forms", "Typed state around native form semantics."],
  ["Static capture", "Browser-rendered HTML from the real application."],
  ["UI source", "Copy components into the project and own every line."],
] as const;

export default page({
  static: true,
  title: "A frontend framework you can own",
  head: () => ({
    description:
      "Mado is a native-first frontend framework for public sites and live applications, with zero third-party runtime dependencies in core.",
    og: {
      title: "Mado — A frontend framework you can own",
      description:
        "The browser is the platform. Mado is the convention.",
      type: "website",
    },
    twitter: { card: "summary" },
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: "Mado",
      applicationCategory: "DeveloperApplication",
      operatingSystem: "Web",
      url: "https://madojs.dev",
      codeRepository: "https://github.com/madojs/mado",
      description:
        "A native-first frontend framework for public sites and live applications.",
    },
  }),
  view: () => html`
    <article class="site-page site-home">
      <section class="site-container home-hero" aria-labelledby="home-title">
        <div class="home-hero-copy mado-ui-stack">
          <p class="site-eyebrow">Native-first · Frontend-only</p>
          <h1 id="home-title">A frontend framework you can own.</h1>
          <p class="home-hero-lead">
            The browser is the platform. Mado is the convention.
          </p>
          <p class="home-hero-description">
            Build public sites and live applications from one Web Component
            and page model. Mado keeps the browser visible: no backend
            runtime, no hydration protocol, no framework compiler, and no
            third-party runtime dependencies in core.
          </p>
          <div class="mado-ui-cluster home-hero-actions">
            <a
              class="mado-ui-button"
              data-size="large"
              data-link
              href=${routeUrl("/start")}
            >
              Start building
            </a>
            <a
              class="mado-ui-button"
              data-size="large"
              data-variant="secondary"
              data-link
              href=${routeUrl("/proof")}
            >
              Inspect the proof
            </a>
          </div>
          <p class="site-status home-hero-status">
            <span aria-hidden="true"></span>
            Pre-1.0 · actively dogfooded
          </p>
        </div>

        <aside class="home-proof-window" aria-label="Mado release contract">
          <header>
            <span>release-contract</span>
            <span>verified by this site</span>
          </header>
          <div class="home-proof-body">
            <p>
              <span>public routes</span>
              <strong>captured HTML</strong>
            </p>
            <p>
              <span>after boot</span>
              <strong>live SPA</strong>
            </p>
            <p>
              <span>core runtime</span>
              <strong>zero third-party deps</strong>
            </p>
            <p>
              <span>deployment</span>
              <strong>static assets</strong>
            </p>
          </div>
          <footer><code>npm run release</code><span>✓</span></footer>
        </aside>
      </section>

      <section class="site-section site-container" aria-labelledby="platform-title">
        <div class="site-section-heading">
          <p class="site-eyebrow">A smaller abstraction</p>
          <h2 id="platform-title">
            Use the platform. Add only the missing coordination.
          </h2>
          <p>
            Mado connects the browser primitives an application repeatedly
            needs. It does not replace the DOM, the History API, custom
            elements or your backend.
          </p>
        </div>
        <div class="home-principles">
          <article>
            <span aria-hidden="true">01</span>
            <h3>Visible platform</h3>
            <p>
              Templates create DOM. Attributes remain attributes. Events
              remain events. Browser knowledge keeps its value.
            </p>
          </article>
          <article>
            <span aria-hidden="true">02</span>
            <h3>Bounded framework</h3>
            <p>
              Components, reactivity, routing, pages, data and forms share a
              lifecycle without growing into a backend platform.
            </p>
          </article>
          <article>
            <span aria-hidden="true">03</span>
            <h3>Owned output</h3>
            <p>
              The release is HTML, CSS and JavaScript. The UI library copies
              editable source instead of adding a browser dependency.
            </p>
          </article>
        </div>
      </section>

      <section class="site-section home-contracts" aria-labelledby="contracts-title">
        <div class="site-container">
          <div class="site-section-heading">
            <p class="site-eyebrow">The application model</p>
            <h2 id="contracts-title">
              Three contracts orient the whole application.
            </h2>
          </div>
          <div class="home-contract-list">
            ${contracts.map((contract) => html`
              <article>
                <span class="home-contract-index">${contract.index}</span>
                <div>
                  <h3>${contract.title}</h3>
                  <p>${contract.copy}</p>
                </div>
                <code class="mado-ui-code">${contract.code}</code>
              </article>
            `)}
          </div>
        </div>
      </section>

      <section class="site-section site-container home-split" aria-labelledby="split-title">
        <div class="site-section-heading">
          <p class="site-eyebrow">Universal without a server runtime</p>
          <h2 id="split-title">Static where public. Live where personal.</h2>
          <p>
            Choose the delivery mode per route without changing component or
            page semantics.
          </p>
        </div>
        <div class="home-split-grid">
          <article>
            <p class="home-split-label">Public document</p>
            <h3>Useful before JavaScript</h3>
            <p>
              <code class="mado-ui-code">mado release</code> opens the real
              application in a browser and captures declared public routes
              with their head metadata.
            </p>
            <ul class="site-check-list">
              <li>Searchable route HTML</li>
              <li>Canonical and social metadata</li>
              <li>Sitemap generated from the route contract</li>
            </ul>
          </article>
          <article>
            <p class="home-split-label">Live application</p>
            <h3>Interactive after one atomic takeover</h3>
            <p>
              The router resumes the same page tree, then signals, forms and
              browser navigation behave like a normal SPA.
            </p>
            <ul class="site-check-list">
              <li>No second component model</li>
              <li>No server hydration protocol</li>
              <li>No backend coupled to the frontend framework</li>
            </ul>
          </article>
        </div>
      </section>

      <section class="site-section home-dogfood" aria-labelledby="dogfood-title">
        <div class="site-container home-dogfood-grid">
          <div class="site-section-heading">
            <p class="site-eyebrow">Proof of concept</p>
            <h2 id="dogfood-title">This site is the proof.</h2>
            <p>
              Every public route on madojs.dev is written as a Mado page,
              captured by the Mado release pipeline, styled with copied Mado
              UI source and packaged for Cloudflare as static assets.
            </p>
            <a class="site-text-link" data-link href=${routeUrl("/proof")}>
              See what is verified <span aria-hidden="true">→</span>
            </a>
          </div>
          ${codeExample({
            label: "Create the same foundation",
            code: installCommand,
          })}
        </div>
      </section>

      <section class="site-section site-container" aria-labelledby="capabilities-title">
        <div class="site-section-heading">
          <p class="site-eyebrow">One lifecycle</p>
          <h2 id="capabilities-title">
            Batteries that share one application model.
          </h2>
        </div>
        <div class="mado-ui-grid home-capability-grid">
          ${capabilities.map(([title, copy]) => html`
            <article>
              <h3>${title}</h3>
              <p>${copy}</p>
            </article>
          `)}
        </div>
      </section>

      <section class="site-section home-agents" aria-labelledby="agents-title">
        <div class="site-container home-agents-grid">
          <div class="site-section-heading">
            <p class="site-eyebrow">A readable codebase</p>
            <h2 id="agents-title">
              Readable by people. Bounded enough for agents.
            </h2>
          </div>
          <div class="home-agents-copy">
            <p>
              Explicit route manifests, ordinary TypeScript and local source
              reduce the invisible state an engineer—or an AI system—must
              reconstruct before making a safe change.
            </p>
            <p>
              Mado ships a versioned <code class="mado-ui-code">llms.txt</code>
              contract so tools can reason from the installed version rather
              than generic framework memory.
            </p>
          </div>
        </div>
      </section>

      <section class="site-section site-container home-boundary" aria-labelledby="boundary-title">
        <div class="site-section-heading">
          <p class="site-eyebrow">A deliberate boundary</p>
          <h2 id="boundary-title">Focused on the frontend.</h2>
          <p>
            Mado does not choose your database, authentication provider, job
            queue or server runtime. Connect any backend through the web
            platform and keep that boundary explicit.
          </p>
        </div>
        <div class="home-boundary-line" aria-hidden="true">
          <span>your backend</span>
          <i></i>
          <strong>HTTP</strong>
          <i></i>
          <span>Mado in the browser</span>
        </div>
      </section>

      <section class="site-section site-container site-final-cta" aria-labelledby="home-cta-title">
        <p class="site-eyebrow">Start from source, not a black box</p>
        <h2 id="home-cta-title">Build the first route in minutes.</h2>
        <p>
          Begin with the verified starter, then keep only the conventions your
          product needs.
        </p>
        <div class="mado-ui-cluster">
          <a
            class="mado-ui-button"
            data-size="large"
            data-link
            href=${routeUrl("/start")}
          >
            Open the quickstart
          </a>
          <a
            class="mado-ui-button"
            data-size="large"
            data-variant="secondary"
            href="https://github.com/madojs/mado"
          >
            Read the source
          </a>
        </div>
      </section>
    </article>
  `,
});
