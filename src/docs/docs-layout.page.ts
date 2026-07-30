import { html, page, routeUrl, type TemplateResult } from "@madojs/mado";

import {
  docsNavigation,
  frameworkVersion,
} from "../generated/docs/navigation";

const normalizePath = (path: string): string =>
  path.length > 1 ? path.replace(/\/+$/, "") : path;

const currentPage = (
  activePath: () => string,
  path: string,
) => (): "page" | null =>
  normalizePath(activePath()) === normalizePath(path) ? "page" : null;

const closeMobileNavigation = (event: Event): void => {
  const target = event.currentTarget;
  if (!(target instanceof Element)) return;
  target.closest<HTMLDetailsElement>("[data-docs-mobile]")
    ?.removeAttribute("open");
};

const documentationNavigation = (
  label: string,
  activePath: () => string,
  mobile = false,
): TemplateResult => html`
  <nav
    class="mado-ui-navigation-list docs-navigation"
    data-docs-sidebar=${mobile ? null : ""}
    aria-label=${label}
  >
    <ul class="mado-ui-navigation-list-items docs-navigation-overview">
      <li class="mado-ui-navigation-list-item">
        <a
          class="mado-ui-navigation-list-link"
          data-link
          href=${routeUrl("/docs")}
          aria-current=${currentPage(activePath, "/docs")}
          @click=${mobile ? closeMobileNavigation : null}
        >
          Overview
        </a>
      </li>
    </ul>

    ${docsNavigation.map((section) => html`
      <section class="docs-navigation-section">
        <p class="mado-ui-navigation-list-label">${section.title}</p>
        <ul class="mado-ui-navigation-list-items">
          ${section.entries.map((entry) => {
            const path = `/docs/${entry.slug}`;
            return html`
              <li class="mado-ui-navigation-list-item">
                <a
                  class="mado-ui-navigation-list-link"
                  data-link
                  href=${routeUrl(path)}
                  aria-current=${currentPage(activePath, path)}
                  @click=${mobile ? closeMobileNavigation : null}
                >
                  ${entry.title}
                </a>
              </li>
            `;
          })}
        </ul>
      </section>
    `)}
  </nav>
`;

export default page({
  view: ({ child, path }) => html`
    <section class="docs-shell" data-docs-shell>
      <div class="site-container docs-mobile-navigation">
        <details
          class="mado-ui-disclosure docs-mobile-disclosure"
          data-docs-mobile
        >
          <summary class="mado-ui-disclosure-summary">
            Browse documentation
          </summary>
          <div class="mado-ui-disclosure-content">
            ${documentationNavigation("Documentation menu", path, true)}
          </div>
        </details>
      </div>

      <div class="site-container docs-layout">
        <aside class="docs-sidebar">
          <div class="docs-sidebar-heading">
            <p>Documentation</p>
            <span>v${frameworkVersion}</span>
          </div>
          ${documentationNavigation("Documentation", path)}
        </aside>

        <div class="docs-route-content">${child}</div>
      </div>
    </section>
  `,
});
