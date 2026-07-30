import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const out = join(root, "out");
const require = createRequire(import.meta.url);

const fail = (message) => {
  throw new Error(`[site release] ${message}`);
};

const installedFramework = readInstalledFramework();
const docsManifest = readDocsManifest();

const read = (relativePath) => {
  const path = join(out, relativePath);
  if (!existsSync(path)) fail(`missing out/${relativePath}`);
  return readFileSync(path, "utf8");
};

const readBytes = (relativePath) => {
  const path = join(out, relativePath);
  if (!existsSync(path)) fail(`missing out/${relativePath}`);
  return readFileSync(path);
};

const assertIncludes = (value, expected, context) => {
  if (!value.includes(expected)) {
    fail(`${context} does not include ${JSON.stringify(expected)}`);
  }
};

const assertCount = (value, expected, count, context) => {
  const actual = value.split(expected).length - 1;
  if (actual !== count) {
    fail(
      `${context} includes ${JSON.stringify(expected)} ${actual} time(s), ` +
        `expected ${count}`,
    );
  }
};

const walk = (directory) =>
  readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? walk(path) : [path];
  });

if (!existsSync(out) || !statSync(out).isDirectory()) {
  fail("out/ does not exist; run npm run release first");
}

const routes = [
  {
    file: "index.html",
    canonical: "https://madojs.dev/",
    title: "A frontend framework you can own.",
    description:
      "Mado is a native-first frontend framework for public sites and live applications, with zero third-party runtime dependencies in core.",
  },
  {
    file: "start/index.html",
    canonical: "https://madojs.dev/start",
    title: "From an empty directory to a running Mado app.",
    description:
      "Create a Mado project, understand its three contracts and build a browser-rendered static release.",
  },
  {
    file: "why/index.html",
    canonical: "https://madojs.dev/why",
    title: "Frontend infrastructure should not become the product.",
    description:
      "Why Mado keeps frontend infrastructure bounded, browser-native and independent from your backend.",
  },
  {
    file: "proof/index.html",
    canonical: "https://madojs.dev/proof",
    title: "The claims are inspectable.",
    description:
      "Inspect the code and release behavior behind Mado's native-first frontend claims.",
  },
  ...docsManifest.routes.map((route) => ({
    ...route,
    canonical: canonicalUrl(route.path),
    file: routeFile(route.path),
    isDocumentation: true,
  })),
];

for (const route of routes) {
  const html = read(route.file);
  const context = `out/${route.file}`;
  assertExactMeta(html, "name", "description", route.description, context);
  assertExactLink(html, "canonical", route.canonical, context);
  assertExactMeta(html, "property", "og:url", route.canonical, context);
  assertExactHeading(html, 1, route.title, undefined, context);
  assertIncludes(html, "data-mado-static", context);

  if (route.isDocumentation) {
    assertIncludes(html, "data-docs-document", context);
    assertNoMarkdownHrefs(html, context);
    assertNoUnresolvedDocPlaceholders(html, context);
    for (const heading of route.headings) {
      assertExactHeading(
        html,
        heading.depth,
        heading.title,
        heading.id,
        context,
      );
    }
  }
}

if (existsSync(join(out, "_redirects"))) {
  fail("out/_redirects exists even though the release owns a static host 404");
}

const fallback = read("_mado/spa.html");
assertIncludes(fallback, 'name="robots"', "out/_mado/spa.html");
assertIncludes(fallback, "noindex", "out/_mado/spa.html");

const notFound = read("404.html");
assertIncludes(notFound, 'name="robots"', "out/404.html");
assertIncludes(notFound, "noindex", "out/404.html");
assertIncludes(notFound, "Page not found", "out/404.html");
assertIncludes(
  notFound,
  "The requested address is not part of the Mado site.",
  "out/404.html",
);
assertIncludes(notFound, "data-mado-static", "out/404.html");
assertIncludes(notFound, "data-mado-static-fallback", "out/404.html");
assertIncludes(
  notFound,
  'name="description" content="The requested page is not part of madojs.dev."',
  "out/404.html",
);
assertCount(notFound, 'name="description"', 1, "out/404.html");
assertCount(notFound, 'name="robots"', 1, "out/404.html");
assertCount(notFound, 'rel="canonical"', 0, "out/404.html");
assertCount(notFound, 'property="og:url"', 0, "out/404.html");
assertCount(notFound, "__mado_static_not_found__", 0, "out/404.html");
if (notFound === fallback) {
  fail("out/404.html is still the empty SPA fallback shell");
}

const sitemap = read("sitemap.xml");
for (const route of routes) {
  const sitemapUrl = route.canonical.replace(/\/$/, "");
  assertIncludes(sitemap, `<loc>${sitemapUrl}</loc>`, "out/sitemap.xml");
}
assertCount(sitemap, "<loc>", routes.length, "out/sitemap.xml");
assertCount(sitemap, "__mado_static_not_found__", 0, "out/sitemap.xml");
assertCount(sitemap, "<loc>https://madojs.dev/404</loc>", 0, "out/sitemap.xml");

verifyLlmsArtifact();

const assetFiles = walk(join(out, "assets"));
const scripts = assetFiles.filter((path) => path.endsWith(".js"));
if (scripts.length === 0) fail("release contains no JavaScript asset");

for (const script of scripts) {
  const prefix = readFileSync(script, "utf8").slice(0, 80).toLowerCase();
  if (prefix.includes("<!doctype") || prefix.includes("<html")) {
    fail(`${script} contains HTML instead of JavaScript`);
  }
}

if (!assetFiles.some((path) => path.endsWith(".br"))) {
  fail("release contains no Brotli precompressed asset");
}
if (!assetFiles.some((path) => path.endsWith(".gz"))) {
  fail("release contains no gzip precompressed asset");
}

const assetsIgnore = read(".assetsignore");
assertIncludes(assetsIgnore, "*.br", "out/.assetsignore");
assertIncludes(assetsIgnore, "*.gz", "out/.assetsignore");
assertIncludes(assetsIgnore, ".mado-output", "out/.assetsignore");

const wrangler = JSON.parse(
  readFileSync(join(root, "wrangler.jsonc"), "utf8"),
);
if (wrangler.assets?.directory !== "./out") {
  fail("wrangler assets.directory must be ./out");
}
if (wrangler.assets?.not_found_handling !== "404-page") {
  fail("wrangler must use 404-page while every public route is static");
}

console.log(
  `[site release] verified ${routes.length} static routes, ` +
    `${docsManifest.routes.length} documentation routes for ` +
    `Mado ${docsManifest.frameworkVersion}, ` +
    `${scripts.length} JavaScript assets, llms.txt and Cloudflare packaging`,
);

function readDocsManifest() {
  const path = join(root, "src/generated/docs/release-manifest.json");
  if (!existsSync(path)) {
    fail(
      "missing src/generated/docs/release-manifest.json; " +
        "run the documentation generator first",
    );
  }

  let manifest;
  try {
    manifest = JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    fail(`documentation release manifest is not valid JSON: ${error.message}`);
  }
  if (manifest.schemaVersion !== 1) {
    fail(
      `unsupported documentation release manifest schema ${String(
        manifest.schemaVersion,
      )}`,
    );
  }

  const candidates = Array.isArray(manifest.routes)
    ? manifest.routes
    : manifest.documents;
  if (!Array.isArray(candidates) || candidates.length === 0) {
    fail("documentation release manifest contains no routes/documents");
  }

  const home = manifest.home ? [manifest.home] : [];
  const routes = [...home, ...candidates].map(normalizeDocsRoute);
  const uniqueRoutes = new Map();
  for (const route of routes) {
    if (uniqueRoutes.has(route.path)) {
      const prior = uniqueRoutes.get(route.path);
      if (JSON.stringify(prior) !== JSON.stringify(route)) {
        fail(`documentation route ${route.path} is declared more than once`);
      }
      continue;
    }
    uniqueRoutes.set(route.path, route);
  }
  if (!uniqueRoutes.has("/docs")) {
    fail("documentation release manifest does not declare /docs");
  }

  const frameworkVersion =
    manifest.frameworkVersion ?? manifest.framework?.version;
  if (
    typeof frameworkVersion !== "string" ||
    !/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/.test(
      frameworkVersion,
    )
  ) {
    fail("documentation release manifest has no valid framework version");
  }
  if (frameworkVersion !== installedFramework.version) {
    fail(
      `documentation manifest declares Mado ${frameworkVersion}, ` +
        `installed package is ${installedFramework.version}`,
    );
  }
  if (
    manifest.llms?.source !== "@madojs/mado/llms.txt" ||
    manifest.llms?.publicPath !== "/llms.txt" ||
    !/^[a-f0-9]{64}$/.test(manifest.llms?.sha256 ?? "")
  ) {
    fail("documentation release manifest has an invalid llms contract");
  }

  return {
    frameworkVersion,
    llms: manifest.llms,
    routes: [...uniqueRoutes.values()],
  };
}

function normalizeDocsRoute(route, index) {
  const path = route?.path ?? route?.route;
  if (
    typeof path !== "string" ||
    !/^\/docs(?:\/[a-z0-9]+(?:[.-][a-z0-9]+)*)*$/.test(path)
  ) {
    fail(`documentation entry ${index} has invalid path ${String(path)}`);
  }
  if (typeof route.title !== "string" || route.title.trim() === "") {
    fail(`documentation route ${path} has no title`);
  }
  if (
    typeof route.description !== "string" ||
    route.description.trim() === ""
  ) {
    fail(`documentation route ${path} has no description`);
  }
  if (typeof route.source !== "string" || route.source.trim() === "") {
    fail(`documentation route ${path} has no source`);
  }
  if (!Array.isArray(route.headings)) {
    fail(`documentation route ${path} has no headings array`);
  }

  return {
    description: route.description,
    headings: route.headings.map((heading, headingIndex) =>
      normalizeHeading(heading, path, headingIndex)
    ),
    path,
    source: route.source,
    title: route.title,
  };
}

function normalizeHeading(heading, path, index) {
  if (typeof heading === "string" && heading.trim() !== "") {
    return { depth: undefined, id: undefined, title: heading };
  }
  const title = heading?.title ?? heading?.text;
  const depth = heading?.depth ?? heading?.level;
  if (typeof title !== "string" || title.trim() === "") {
    fail(`documentation route ${path} heading ${index} has no title`);
  }
  if (depth !== undefined && (!Number.isInteger(depth) || depth < 2 || depth > 6)) {
    fail(`documentation route ${path} heading ${index} has invalid depth`);
  }
  if (
    heading.id !== undefined &&
    (typeof heading.id !== "string" || heading.id.trim() === "")
  ) {
    fail(`documentation route ${path} heading ${index} has invalid id`);
  }
  return { depth, id: heading.id, title };
}

function routeFile(pathname) {
  if (pathname === "/") return "index.html";
  return `${pathname.slice(1)}/index.html`;
}

function canonicalUrl(pathname) {
  return `https://madojs.dev${pathname}`;
}

function assertExactMeta(html, key, name, expected, context) {
  const matching = tags(html, "meta").filter(
    (tag) => attribute(tag, key) === name,
  );
  if (matching.length !== 1) {
    fail(
      `${context} includes meta ${key}=${JSON.stringify(name)} ` +
        `${matching.length} time(s), expected 1`,
    );
  }
  const actual = decodeHtml(attribute(matching[0], "content") ?? "");
  if (actual !== expected) {
    fail(
      `${context} meta ${key}=${JSON.stringify(name)} is ` +
        `${JSON.stringify(actual)}, expected ${JSON.stringify(expected)}`,
    );
  }
}

function assertExactLink(html, relation, expected, context) {
  const matching = tags(html, "link").filter((tag) =>
    (attribute(tag, "rel") ?? "").split(/\s+/).includes(relation)
  );
  if (matching.length !== 1) {
    fail(
      `${context} includes link rel=${JSON.stringify(relation)} ` +
        `${matching.length} time(s), expected 1`,
    );
  }
  const actual = decodeHtml(attribute(matching[0], "href") ?? "");
  if (actual !== expected) {
    fail(
      `${context} link rel=${JSON.stringify(relation)} is ` +
        `${JSON.stringify(actual)}, expected ${JSON.stringify(expected)}`,
    );
  }
}

function assertExactHeading(html, depth, expected, id, context) {
  const headings = [...html.matchAll(
    /<h([1-6])\b([^>]*)>([\s\S]*?)<\/h\1>/gi,
  )].map((match) => ({
    depth: Number(match[1]),
    id: attribute(match[2], "id"),
    title: normalizeText(match[3]),
  }));
  const matching = headings.filter(
    (heading) =>
      (depth === undefined || heading.depth === depth) &&
      (id === undefined || heading.id === id) &&
      heading.title === expected,
  );
  if (matching.length !== 1) {
    const identity = id ? `#${id}` : JSON.stringify(expected);
    fail(
      `${context} includes expected heading ${identity} ` +
        `${matching.length} time(s), expected 1`,
    );
  }
  if (depth === 1) {
    const allH1 = headings.filter((heading) => heading.depth === 1);
    if (allH1.length !== 1) {
      fail(`${context} contains ${allH1.length} h1 elements, expected 1`);
    }
  }
}

function assertNoMarkdownHrefs(html, context) {
  const allowedSourcePrefix =
    `https://github.com/madojs/mado/blob/v${docsManifest.frameworkVersion}/`;
  for (const tag of tags(html, "a")) {
    const href = decodeHtml(attribute(tag, "href") ?? "");
    if (!/\.md(?:[?#].*)?$/i.test(href)) continue;
    if (!/^https?:\/\//i.test(href)) {
      fail(
        `${context} contains unresolved Markdown href ${JSON.stringify(href)}`,
      );
    }
    let url;
    try {
      url = new URL(href);
    } catch {
      fail(`${context} contains invalid external Markdown href ${href}`);
    }
    if (url.origin === "https://madojs.dev") {
      fail(
        `${context} contains unresolved site Markdown href ` +
          JSON.stringify(href),
      );
    }
    if (
      href.startsWith("https://github.com/madojs/mado/blob/") &&
      !href.startsWith(allowedSourcePrefix)
    ) {
      fail(
        `${context} contains unpinned Mado source href ${JSON.stringify(href)}`,
      );
    }
  }
}

function assertNoUnresolvedDocPlaceholders(html, context) {
  const patterns = [
    /__MADO_DOCS?_[A-Z0-9_]+__/,
    /%%MADO_DOCS?_[A-Z0-9_]+%%/,
    /\bhref\s*=\s*(["'])[^"']*(?:\{\{[^}]+\}\}|__DOC[^"']+__)[^"']*\1/i,
    /\bdata-doc-route(?:\s*=|\b)/i,
  ];
  if (patterns.some((pattern) => pattern.test(html))) {
    fail(`${context} contains an unresolved documentation placeholder`);
  }
}

function verifyLlmsArtifact() {
  const packageLlmsPath = installedFramework.llmsPath;
  if (!existsSync(packageLlmsPath)) {
    fail("installed @madojs/mado package does not contain llms.txt");
  }
  const expected = readFileSync(packageLlmsPath);
  const actual = readBytes("llms.txt");
  if (!actual.equals(expected)) {
    fail(
      "out/llms.txt differs from the exact installed " +
        `@madojs/mado ${docsManifest.frameworkVersion} llms.txt`,
    );
  }

  const digest = createHash("sha256").update(actual).digest("hex");
  if (docsManifest.llms.sha256 !== digest) {
    fail(
      `out/llms.txt has sha256 ${digest}, ` +
        `manifest declares ${String(docsManifest.llms.sha256)}`,
    );
  }
}

function readInstalledFramework() {
  const packagePath = require.resolve("@madojs/mado/package.json");
  let manifest;
  try {
    manifest = JSON.parse(readFileSync(packagePath, "utf8"));
  } catch (error) {
    fail(`could not read installed Mado package manifest: ${error.message}`);
  }
  if (
    manifest.name !== "@madojs/mado" ||
    typeof manifest.version !== "string"
  ) {
    fail("resolved documentation is not owned by a valid @madojs/mado package");
  }
  return {
    llmsPath: require.resolve("@madojs/mado/llms.txt"),
    version: manifest.version,
  };
}

function tags(html, name) {
  return html.match(new RegExp(`<${name}\\b[^>]*>`, "gi")) ?? [];
}

function attribute(tag, name) {
  const match = tag.match(
    new RegExp(`(?:^|\\s)${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)')`, "i"),
  );
  return match?.[1] ?? match?.[2];
}

function normalizeText(value) {
  return decodeHtml(
    value.replace(/<br\s*\/?>/gi, " ").replace(/<[^>]*>/g, ""),
  ).replace(/\s+/g, " ").trim();
}

function decodeHtml(value) {
  return value.replace(
    /&(?:#(\d+)|#x([0-9a-f]+)|([a-z]+));/gi,
    (entity, decimal, hexadecimal, named) => {
      if (decimal) return String.fromCodePoint(Number.parseInt(decimal, 10));
      if (hexadecimal) {
        return String.fromCodePoint(Number.parseInt(hexadecimal, 16));
      }
      return {
        amp: "&",
        apos: "'",
        gt: ">",
        lt: "<",
        nbsp: "\u00a0",
        quot: '"',
      }[named.toLowerCase()] ?? entity;
    },
  );
}
