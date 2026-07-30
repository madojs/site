import {
  html,
  page,
  ref,
  routeUrl,
  unsafeHTML,
  type Page,
  type TemplateResult,
} from "@madojs/mado";

import { frameworkVersion } from "../generated/docs/routes";

export interface DocumentLink {
  readonly slug: string;
  readonly title: string;
}

export interface DocumentHeading {
  readonly id: string;
  readonly title: string;
  readonly depth: 2 | 3;
}

export interface GeneratedDocument {
  readonly slug: string;
  readonly source: string;
  readonly title: string;
  readonly description: string;
  readonly html: string;
  readonly toc: readonly DocumentHeading[];
  readonly sectionId: string;
  readonly sectionTitle: string;
  readonly previous: DocumentLink | null;
  readonly next: DocumentLink | null;
}

const documentationPath = (slug: string): string => `/docs/${slug}`;

const sourceUrl = (source: string): string => {
  const sourcePath = source
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/");
  const version = encodeURIComponent(frameworkVersion);
  return `https://github.com/madojs/mado/blob/v${version}/docs/en/${sourcePath}`;
};

const isDocumentationRoute = (value: string): boolean =>
  /^\/docs(?:\/[a-z0-9]+(?:[.-][a-z0-9]+)*)?(?:#[a-z0-9][a-z0-9._:-]*)?$/i
    .test(value);

/**
 * Generated Markdown is trusted build output from the installed Mado package.
 * The ref runs after insertion so internal link placeholders can still pass
 * through Mado's base-aware route helper before snapshots are captured.
 */
const enhanceGeneratedDocument = (element: HTMLElement | null): void => {
  if (!element) return;

  for (const anchor of element.querySelectorAll<HTMLAnchorElement>(
    "a[data-doc-route]",
  )) {
    const path = anchor.dataset.docRoute;
    if (!path || !isDocumentationRoute(path)) {
      throw new Error(`Invalid generated documentation route: ${path ?? ""}`);
    }
    anchor.href = routeUrl(path);
    anchor.dataset.link = "";
    anchor.removeAttribute("data-doc-route");
  }

  for (const pre of element.querySelectorAll<HTMLPreElement>("pre")) {
    pre.classList.add("mado-ui-code-block");
    pre.tabIndex = 0;
    const code = pre.querySelector("code");
    code?.classList.add("mado-ui-code");
  }

  for (const table of element.querySelectorAll<HTMLTableElement>("table")) {
    table.tabIndex = 0;
  }

  for (const code of element.querySelectorAll<HTMLElement>(
    "code:not(pre code)",
  )) {
    code.classList.add("mado-ui-code");
  }
};

const breadcrumbs = (document: GeneratedDocument): TemplateResult => html`
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
        <a
          class="mado-ui-breadcrumbs-link"
          data-link
          href=${routeUrl("/docs")}
        >
          Documentation
        </a>
      </li>
      <li class="mado-ui-breadcrumbs-item">
        <span aria-current="page">${document.title}</span>
      </li>
    </ol>
  </nav>
`;

const tableOfContents = (
  document: GeneratedDocument,
  placement: "inline" | "rail",
): TemplateResult | null =>
  document.toc.length === 0
    ? null
    : html`
        <nav
          class=${`docs-toc docs-toc-${placement}`}
          data-docs-toc
          data-placement=${placement}
          aria-label="On this page"
        >
          <p class="docs-toc-label">On this page</p>
          <ol>
            ${document.toc.map((heading) => html`
              <li data-depth=${String(heading.depth)}>
                <a
                  data-link
                  href=${routeUrl(
                    `${documentationPath(document.slug)}#${heading.id}`,
                  )}
                >
                  ${heading.title}
                </a>
              </li>
            `)}
          </ol>
        </nav>
      `;

const adjacentDocument = (
  label: string,
  document: DocumentLink | null,
  direction: "previous" | "next",
): TemplateResult | null =>
  document
    ? html`
        <a
          class="docs-adjacent-link"
          data-direction=${direction}
          data-link
          href=${routeUrl(documentationPath(document.slug))}
        >
          <span>${label}</span>
          <strong>${document.title}</strong>
        </a>
      `
    : null;

const documentView = (document: GeneratedDocument): TemplateResult => html`
  <div class="docs-document-grid">
    <article
      class="docs-document"
      data-docs-document
      ref=${ref<HTMLElement>(enhanceGeneratedDocument)}
    >
      ${breadcrumbs(document)}
      <p class="docs-document-context">
        <span>${document.sectionTitle}</span>
        <span aria-hidden="true">·</span>
        <span>Mado ${frameworkVersion}</span>
      </p>

      <div class="docs-markdown">
        <h1>${document.title}</h1>
        ${tableOfContents(document, "inline")}
        <div class="docs-generated-body">${unsafeHTML(document.html)}</div>
      </div>

      <footer class="docs-document-footer">
        <a class="docs-source-link" href=${sourceUrl(document.source)}>
          View versioned source
          <span aria-hidden="true">↗</span>
        </a>
        <nav class="docs-adjacent" aria-label="Adjacent documentation">
          ${adjacentDocument("Previous", document.previous, "previous")}
          ${adjacentDocument("Next", document.next, "next")}
        </nav>
      </footer>
    </article>

    ${tableOfContents(document, "rail")}
  </div>
`;

export const defineDocumentPage = (
  document: GeneratedDocument,
): Page => page({
  static: true,
  title: document.title,
  head: () => ({
    description: document.description,
    og: {
      title: `${document.title} · Mado documentation`,
      description: document.description,
      type: "article",
    },
  }),
  view: () => documentView(document),
});
