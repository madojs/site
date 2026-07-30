import { html, page, routeUrl } from "@madojs/mado";

import {
  docsDocuments,
  docsNavigation,
  frameworkVersion,
} from "../generated/docs/navigation";

export default page({
  static: true,
  title: "Documentation",
  head: () => ({
    description:
      "Read the complete Mado framework documentation, generated from the " +
      "exact package used to build this site.",
    og: {
      title: "Mado documentation",
      description:
        "Learn Mado from its package-versioned guides, concepts and API reference.",
      type: "website",
    },
  }),
  view: () => html`
    <article class="docs-home" data-docs-document>
      <nav class="mado-ui-breadcrumbs docs-breadcrumbs" aria-label="Breadcrumb">
        <ol class="mado-ui-breadcrumbs-list">
          <li class="mado-ui-breadcrumbs-item">
            <a
              class="mado-ui-breadcrumbs-link"
              data-link
              href=${routeUrl("/")}
            >
              Home
            </a>
          </li>
          <li class="mado-ui-breadcrumbs-item">
            <span aria-current="page">Documentation</span>
          </li>
        </ol>
      </nav>

      <header class="docs-home-header">
        <p class="site-eyebrow">Mado ${frameworkVersion}</p>
        <h1 id="docs-home-title">Documentation that matches the package.</h1>
        <p>
          Learn the framework from the source shipped with the exact Mado
          version running this site. ${docsDocuments.length} documents cover
          the path from a first page to a production release.
        </p>
        <div class="docs-home-actions">
          <a
            class="mado-ui-button"
            data-link
            href=${routeUrl("/docs/quickstart")}
          >
            Read the quickstart
          </a>
          <a
            class="mado-ui-button"
            data-variant="secondary"
            href=${`https://github.com/madojs/mado/tree/v${frameworkVersion}/docs/en`}
          >
            Browse versioned source
            <span aria-hidden="true">↗</span>
          </a>
        </div>
      </header>

      <div class="docs-home-sections">
        ${docsNavigation.map((section, index) => html`
          <section aria-labelledby=${`docs-section-${section.id}`}>
            <header>
              <p class="docs-section-index" aria-hidden="true">
                ${String(index + 1).padStart(2, "0")}
              </p>
              <h2 id=${`docs-section-${section.id}`}>${section.title}</h2>
            </header>
            <ul>
              ${section.entries.map((entry) => html`
                <li>
                  <a
                    data-link
                    href=${routeUrl(`/docs/${entry.slug}`)}
                  >
                    <strong>${entry.title}</strong>
                    <span>${entry.description}</span>
                  </a>
                </li>
              `)}
            </ul>
          </section>
        `)}
      </div>
    </article>
  `,
});
