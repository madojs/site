import { html, page, routeUrl } from "@madojs/mado";
import {
  proofContractSchemaVersion,
  proofRows,
} from "../generated/docs/proof";
import "../styles/proof.css";

const evidence = [
  {
    number: "01",
    title: "Document before boot",
    claim:
      "Each declared public route is present as meaningful captured HTML before application JavaScript runs.",
    inspect: "Open this page with JavaScript disabled.",
    href: "https://github.com/madojs/mado/tree/main/scripts/static",
    link: "Static capture source",
  },
  {
    number: "02",
    title: "Live app after boot",
    claim:
      "The same route becomes a client-side application with intercepted links, lazy pages, scroll restoration and focus management.",
    inspect: "Use the site navigation and inspect the unchanged document shell.",
    href: "https://github.com/madojs/mado/tree/main/src/router",
    link: "Router source",
  },
  {
    number: "03",
    title: "Frontend-only deployment",
    claim:
      "The production artifact is HTML, CSS, JavaScript and deployment metadata. No Mado server process is required.",
    inspect: "Run npm run release and inspect out/.",
    href: "https://github.com/madojs/mado/blob/main/scripts/cli/release.mjs",
    link: "Release command",
  },
  {
    number: "04",
    title: "No third-party runtime dependencies in core",
    claim:
      "Mado core composes browser APIs directly; its npm package does not pull a separate application runtime graph into the browser.",
    inspect: "Inspect the framework package manifest and the emitted bundle.",
    href: "https://github.com/madojs/mado/blob/main/package.json",
    link: "Package manifest",
  },
  {
    number: "05",
    title: "Source-owned UI",
    claim:
      "The UI CLI copies component and CSS source into the application. This site can change every installed line locally.",
    inspect: "Compare this repository's src/styles with the UI registry.",
    href: "https://ui.madojs.dev",
    link: "Mado UI catalog",
  },
  {
    number: "06",
    title: "Tested release behavior",
    claim:
      "The project exercises browser capture, atomic takeover, navigation, metadata and deployment output as release contracts.",
    inspect: "Read the framework browser and release test suites.",
    href: "https://github.com/madojs/mado/tree/main/test",
    link: "Framework tests",
  },
  {
    number: "07",
    title: "Versioned agent context",
    claim:
      "The installed framework ships its own llms.txt so coding systems can reason from the package version actually in the project.",
    inspect: "Open node_modules/@madojs/mado/llms.txt.",
    href: "https://github.com/madojs/mado/blob/main/llms.txt",
    link: "Agent contract",
  },
] as const;

export default page({
  static: true,
  title: "Proof",
  head: () => ({
    description:
      "Inspect the code and release behavior behind Mado's native-first frontend claims.",
    og: {
      title: "Mado proof",
      description: "The claims are inspectable.",
      type: "article",
    },
  }),
  view: () => html`
    <article class="site-page site-editorial site-proof">
      <header class="mado-ui-page-header site-container site-page-header">
        <div class="mado-ui-page-header-heading">
          <p class="mado-ui-page-header-eyebrow">Proof</p>
          <h1 class="mado-ui-page-header-title">The claims are inspectable.</h1>
          <p class="mado-ui-page-header-description">
            This page distinguishes architectural promises from evidence in
            the current source, tests and deployment artifact. Mado is pre-1.0;
            honesty about that state is part of the contract.
          </p>
        </div>
        <div class="mado-ui-page-header-actions">
          <a
            class="mado-ui-button"
            data-variant="secondary"
            href="https://github.com/madojs/mado"
          >
            Open repository
          </a>
        </div>
      </header>

      <section
        class="site-container proof-console"
        data-proof-contract=${String(proofContractSchemaVersion)}
        aria-labelledby="proof-console-title"
      >
        <header>
          <div>
            <span aria-hidden="true"></span>
            <p id="proof-console-title">madojs.dev / release audit</p>
          </div>
          <strong>build contract</strong>
        </header>
        <div class="proof-console-body">
          ${proofRows.map((row) => html`
            <p
              data-proof-row=${row.id}
              data-proof-value=${row.value}
              data-proof-status=${row.status}
            >
              <span>${row.label}</span>
              <strong>${row.value}</strong>
              <i>${row.status}</i>
            </p>
          `)}
        </div>
        <footer>
          Generated locally from the authored routes, documentation release
          data, exact installed Mado package and the Mado UI lock. Release
          verification asserts the rendered rows; no remote telemetry is used.
        </footer>
      </section>

      <section class="site-container proof-evidence" aria-labelledby="proof-evidence-title">
        <div class="site-section-heading">
          <p class="site-eyebrow">Current evidence</p>
          <h2 id="proof-evidence-title">Seven claims you can check yourself.</h2>
        </div>
        <div class="proof-evidence-list">
          ${evidence.map((item) => html`
            <article>
              <span class="proof-evidence-number">${item.number}</span>
              <div class="proof-evidence-copy">
                <h3>${item.title}</h3>
                <p>${item.claim}</p>
                <p><strong>Inspect:</strong> ${item.inspect}</p>
              </div>
              <a class="site-text-link" href=${item.href}>
                ${item.link} <span aria-hidden="true">↗</span>
              </a>
            </article>
          `)}
        </div>
      </section>

      <section class="proof-nonclaims" aria-labelledby="proof-nonclaims-title">
        <div class="site-container proof-nonclaims-grid">
          <div class="site-section-heading">
            <p class="site-eyebrow">Honest non-claims</p>
            <h2 id="proof-nonclaims-title">What this proof does not establish.</h2>
          </div>
          <ul class="site-cross-list">
            <li>Mado is not stable 1.0 software yet.</li>
            <li>It does not provide a backend or server rendering runtime.</li>
            <li>It does not claim the ecosystem depth of older frameworks.</li>
            <li>One dogfood site is not proof for every application shape.</li>
            <li>APIs may still change when real projects expose a better model.</li>
          </ul>
        </div>
      </section>

      <section class="site-container proof-method" aria-labelledby="proof-method-title">
        <div>
          <p class="site-eyebrow">The method</p>
          <h2 id="proof-method-title">Build, inspect, correct, repeat.</h2>
        </div>
        <div>
          <p>
            This site exists to find mismatches between the framework promise
            and production reality. Findings are recorded before local
            workarounds become accidental architecture.
          </p>
          <a class="site-text-link" data-link href=${routeUrl("/start")}>
            Build the same release <span aria-hidden="true">→</span>
          </a>
        </div>
      </section>
    </article>
  `,
});
