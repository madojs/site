import { html, routeUrl, type TemplateResult } from "@madojs/mado";

import { appRoutes } from "./app.routes";

interface InternalNavigationItem {
  label: string;
  path: "/" | "/start" | "/why" | "/proof" | "/docs";
  kind: "internal";
  match?: "exact" | "prefix";
}

interface ExternalNavigationItem {
  label: string;
  href: string;
  kind: "external";
}

type NavigationItem = InternalNavigationItem | ExternalNavigationItem;

const navigationItems: NavigationItem[] = [
  { label: "Start", path: "/start", kind: "internal" },
  { label: "Docs", path: "/docs", kind: "internal", match: "prefix" },
  { label: "Why Mado", path: "/why", kind: "internal" },
  { label: "Proof", path: "/proof", kind: "internal" },
  {
    label: "UI",
    href: "https://github.com/madojs/ui",
    kind: "external",
  },
  {
    label: "GitHub",
    href: "https://github.com/madojs/mado",
    kind: "external",
  },
];

const normalizePath = (path: string): string =>
  path.length > 1 ? path.replace(/\/+$/, "") : path;

const ariaCurrent = (
  path: string,
  match: "exact" | "prefix" = "exact",
) => (): "page" | null => {
  const current = normalizePath(appRoutes.path());
  const target = normalizePath(path);
  const matches = match === "prefix"
    ? current === target || current.startsWith(`${target}/`)
    : current === target;
  return matches ? "page" : null;
};

const closeMobileNavigation = (): void => {
  const menu = document.querySelector<HTMLElement & {
    hidePopover?: () => void;
  }>("#site-mobile-menu");
  menu?.hidePopover?.();
};

const navigation = (
  label: string,
  id: string,
  closeOnNavigate = false,
): TemplateResult => html`
  <nav
    id=${id}
    class="mado-ui-navigation-list site-navigation"
    data-layout="horizontal"
    aria-label=${label}
  >
    <ul class="mado-ui-navigation-list-items">
      ${navigationItems.map((item) => html`
        <li class="mado-ui-navigation-list-item">
          ${item.kind === "internal"
            ? html`
                <a
                  class="mado-ui-navigation-list-link"
                  data-link
                  href=${routeUrl(item.path)}
                  aria-current=${ariaCurrent(item.path, item.match)}
                  @click=${closeOnNavigate ? closeMobileNavigation : null}
                >
                  ${item.label}
                </a>
              `
            : html`
                <a
                  class="mado-ui-navigation-list-link"
                  href=${item.href}
                >
                  ${item.label}
                  <span class="site-external-mark" aria-hidden="true">↗</span>
                </a>
              `}
        </li>
      `)}
    </ul>
  </nav>
`;

const brand = (): TemplateResult => html`
  <a
    class="site-brand"
    data-link
    href=${routeUrl("/")}
    aria-label="Mado home"
  >
    <svg
      class="site-brand-mark"
      viewBox="0 0 32 32"
      aria-hidden="true"
    >
      <rect x="3.5" y="5.5" width="25" height="21" rx="3.5"></rect>
      <path d="M4 11.5h24"></path>
      <circle cx="8" cy="8.6" r="1"></circle>
      <path d="M9.5 21V16l6.5 4 6.5-4v5"></path>
    </svg>
    <span>Mado</span>
  </a>
`;

export const siteShell = (): TemplateResult => html`
  <a class="site-skip-link" href="#main-content">Skip to content</a>

  <div class="site-shell">
    <header class="site-header">
      <div class="site-container site-header-inner">
        ${brand()}

        <div class="site-desktop-navigation">
          ${navigation("Primary navigation", "site-primary-navigation")}
        </div>

        <button
          class="mado-ui-button mado-ui-popover-invoker site-menu-trigger"
          type="button"
          data-variant="secondary"
          data-size="small"
          popovertarget="site-mobile-menu"
          aria-label="Open primary navigation"
        >
          Menu
        </button>

        <aside
          id="site-mobile-menu"
          class="mado-ui-popover site-mobile-menu"
          popover="auto"
          aria-labelledby="site-mobile-menu-title"
        >
          <header class="mado-ui-popover-header">
            <h2 id="site-mobile-menu-title" class="mado-ui-popover-title">
              Navigate Mado
            </h2>
            <p class="mado-ui-popover-description">
              Framework principles, versioned documentation and inspectable
              proof.
            </p>
          </header>
          <div class="mado-ui-popover-content">
            ${navigation(
              "Mobile primary navigation",
              "site-mobile-navigation",
              true,
            )}
          </div>
          <footer class="mado-ui-popover-actions">
            <button
              class="mado-ui-button mado-ui-popover-dismiss"
              type="button"
              data-variant="secondary"
              data-size="small"
              popovertarget="site-mobile-menu"
              popovertargetaction="hide"
            >
              Close
            </button>
          </footer>
        </aside>
      </div>
    </header>

    <main id="main-content" class="site-main" data-mado-focus tabindex="-1">
      ${appRoutes.view}
    </main>

    <footer class="site-footer">
      <div class="site-container site-footer-grid">
        <div class="site-footer-intro mado-ui-stack">
          ${brand()}
          <p>Mado stops at the browser. Bring any backend.</p>
          <p class="site-status">
            <span aria-hidden="true"></span>
            Pre-1.0 · actively dogfooded
          </p>
        </div>

        <nav class="site-footer-links" aria-label="Project">
          <h2>Project</h2>
          <a data-link href=${routeUrl("/start")}>Start building</a>
          <a data-link href=${routeUrl("/docs")}>Documentation</a>
          <a data-link href=${routeUrl("/why")}>Why Mado</a>
          <a data-link href=${routeUrl("/proof")}>Proof</a>
        </nav>

        <nav class="site-footer-links" aria-label="Source">
          <h2>Source</h2>
          <a href="https://github.com/madojs/mado">Framework</a>
          <a href="https://github.com/madojs/ui">UI library</a>
          <a href="https://www.npmjs.com/package/@madojs/mado">npm package</a>
        </nav>
      </div>
      <div class="site-container site-footer-meta">
        <span>Native-first · Frontend-only</span>
        <span>Built with Mado and Mado UI</span>
      </div>
    </footer>
  </div>
`;
