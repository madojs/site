import { html, routeUrl, routes } from "@madojs/mado";

export const manifest = {
  "/": () => import("./pages/home.page"),
  "/start": () => import("./pages/start.page"),
  "/why": () => import("./pages/why.page"),
  "/proof": () => import("./pages/proof.page"),
  "*": () => import("./pages/not-found.page"),
};

export const appRoutes = routes(manifest, {
  titleSuffix: " · Mado",
  loading: () => html`
    <div class="site-route-status" role="status">
      <span class="site-route-status-bar" aria-hidden="true"></span>
      Loading page…
    </div>
  `,
  errorPage: () => html`
    <article class="mado-ui-content-state site-route-error" data-tone="danger">
      <div class="mado-ui-content-state-media" aria-hidden="true">!</div>
      <div class="mado-ui-content-state-content">
        <h1 class="mado-ui-content-state-title">This page did not load</h1>
        <p class="mado-ui-content-state-description">
          The route failed before Mado could render it. Reload the page or
          return to the start.
        </p>
      </div>
      <div class="mado-ui-content-state-actions">
        <a class="mado-ui-button" data-link href=${routeUrl("/")}>
          Return home
        </a>
      </div>
    </article>
  `,
});

export default appRoutes;
