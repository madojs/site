import { html, page, routeUrl } from "@madojs/mado";
import "../styles/why.css";

const reasons = [
  {
    title: "Own the application",
    copy:
      "Framework source remains small, UI source lives beside product code, and the production artifact is ordinary web output.",
  },
  {
    title: "Keep the platform visible",
    copy:
      "Custom elements, DOM events, forms, URLs and browser APIs keep their native meaning instead of becoming framework-shaped imitations.",
  },
  {
    title: "Share one model",
    copy:
      "Public documents and live application routes use the same component, page and lifecycle contracts.",
  },
  {
    title: "Choose the backend independently",
    copy:
      "Use any HTTP service, database stack or deployment topology. Mado does not turn a frontend choice into a server commitment.",
  },
  {
    title: "Write ordinary TypeScript",
    copy:
      "There is no framework template language or custom compiler to decode before a contributor can follow the control flow.",
  },
] as const;

export default page({
  static: true,
  title: "Why Mado",
  head: () => ({
    description:
      "Why Mado keeps frontend infrastructure bounded, browser-native and independent from your backend.",
    og: {
      title: "Why Mado",
      description:
        "Frontend infrastructure should not become the product.",
      type: "article",
    },
  }),
  view: () => html`
    <article class="site-page site-editorial site-why">
      <header class="mado-ui-page-header site-container site-page-header">
        <div class="mado-ui-page-header-heading">
          <p class="mado-ui-page-header-eyebrow">Why Mado</p>
          <h1 class="mado-ui-page-header-title">
            Frontend infrastructure should not become the product.
          </h1>
          <p class="mado-ui-page-header-description">
            Modern applications need real coordination. They do not
            automatically need a server-owned rendering protocol, an
            all-purpose platform or a dependency graph that expires before the
            product does.
          </p>
        </div>
      </header>

      <section class="site-container editorial-section why-thesis" aria-labelledby="why-thesis-title">
        <p class="site-eyebrow">The premise</p>
        <h2 id="why-thesis-title">
          A framework should make browser applications predictable, then get
          out of the way.
        </h2>
        <p class="editorial-lead">
          Mado packages the recurring coordination around DOM updates,
          component lifecycle, routes, page data and forms. Its boundary is
          intentionally narrow enough that platform skills—and the code you
          write today—remain useful later.
        </p>
      </section>

      <section class="why-reasons" aria-label="Reasons to choose Mado">
        <div class="site-container">
          ${reasons.map((reason, index) => html`
            <article>
              <span>${String(index + 1).padStart(2, "0")}</span>
              <h2>${reason.title}</h2>
              <p>${reason.copy}</p>
            </article>
          `)}
        </div>
      </section>

      <section class="site-container editorial-section" aria-labelledby="why-choice-title">
        <div class="site-section-heading">
          <p class="site-eyebrow">Choose honestly</p>
          <h2 id="why-choice-title">The boundary is a feature, not a universal answer.</h2>
        </div>
        <div class="why-choice-grid">
          <article>
            <h3>Choose Mado when</h3>
            <ul class="site-check-list">
              <li>You are building a browser frontend, not a backend platform.</li>
              <li>You want static public pages and live app routes to share one model.</li>
              <li>You prefer explicit conventions over framework magic.</li>
              <li>You want runtime dependencies and generated abstractions kept small.</li>
              <li>You are comfortable working near Web Components and browser APIs.</li>
            </ul>
          </article>
          <article>
            <h3>Choose something else when</h3>
            <ul class="site-cross-list">
              <li>You need an integrated backend, ORM or server-action model.</li>
              <li>Your team depends on a mature pre-1.0-incompatible ecosystem.</li>
              <li>You need native mobile rendering from the same component tree.</li>
              <li>You want the framework to own infrastructure and deployment decisions.</li>
              <li>You cannot accept a young project whose APIs are still being refined.</li>
            </ul>
          </article>
        </div>
      </section>

      <section class="site-container why-boundary-proof" aria-labelledby="why-boundary-title">
        <div>
          <p class="site-eyebrow">The actual line</p>
          <h2 id="why-boundary-title">Mado ends where the browser ends.</h2>
        </div>
        <p>
          Authentication tokens, API contracts and server behavior remain
          yours. Mado can help the frontend consume them; it does not pretend
          to be the system behind them.
        </p>
      </section>

      <section class="site-container site-final-cta" aria-labelledby="why-proof-title">
        <p class="site-eyebrow">Claims need evidence</p>
        <h2 id="why-proof-title">Inspect what this boundary produces.</h2>
        <p>
          The proof page separates what the current code verifies from what
          Mado does not claim yet.
        </p>
        <a
          class="mado-ui-button"
          data-size="large"
          data-link
          href=${routeUrl("/proof")}
        >
          Inspect the proof
        </a>
      </section>
    </article>
  `,
});
