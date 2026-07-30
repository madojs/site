import { html, page, routeUrl } from "@madojs/mado";

export default page({
  static: true,
  title: "Page not found",
  head: () => ({
    description: "The requested page is not part of madojs.dev.",
    meta: [{ name: "robots", content: "noindex, nofollow" }],
  }),
  view: () => html`
    <article class="site-page site-container site-not-found">
      <div class="mado-ui-content-state" data-tone="neutral">
        <div class="mado-ui-content-state-media site-404-mark" aria-hidden="true">
          404
        </div>
        <div class="mado-ui-content-state-content">
          <h1 class="mado-ui-content-state-title">Page not found</h1>
          <p class="mado-ui-content-state-description">
            The requested address is not part of the Mado site.
          </p>
        </div>
        <div class="mado-ui-content-state-actions">
          <a class="mado-ui-button" data-link href=${routeUrl("/")}>
            Return home
          </a>
          <a
            class="mado-ui-button"
            data-variant="secondary"
            data-link
            href=${routeUrl("/start")}
          >
            Open the quickstart
          </a>
        </div>
      </div>
    </article>
  `,
});
