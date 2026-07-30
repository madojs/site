import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const out = join(root, "out");

const fail = (message) => {
  throw new Error(`[site release] ${message}`);
};

const read = (relativePath) => {
  const path = join(out, relativePath);
  if (!existsSync(path)) fail(`missing out/${relativePath}`);
  return readFileSync(path, "utf8");
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
    copy: "A frontend framework you can own.",
    description:
      "Mado is a native-first frontend framework for public sites and live applications, with zero third-party runtime dependencies in core.",
  },
  {
    file: "start/index.html",
    canonical: "https://madojs.dev/start",
    copy: "From an empty directory to a running Mado app.",
    description:
      "Create a Mado project, understand its three contracts and build a browser-rendered static release.",
  },
  {
    file: "why/index.html",
    canonical: "https://madojs.dev/why",
    copy: "Frontend infrastructure should not become the product.",
    description:
      "Why Mado keeps frontend infrastructure bounded, browser-native and independent from your backend.",
  },
  {
    file: "proof/index.html",
    canonical: "https://madojs.dev/proof",
    copy: "The claims are inspectable.",
    description:
      "Inspect the code and release behavior behind Mado's native-first frontend claims.",
  },
];

for (const route of routes) {
  const html = read(route.file);
  assertIncludes(html, route.copy, `out/${route.file}`);
  assertIncludes(
    html,
    `name="description" content="${route.description}"`,
    `out/${route.file}`,
  );
  assertCount(
    html,
    'name="description"',
    1,
    `out/${route.file}`,
  );
  assertIncludes(
    html,
    `<link rel="canonical" href="${route.canonical}"`,
    `out/${route.file}`,
  );
  assertCount(html, 'rel="canonical"', 1, `out/${route.file}`);
  assertCount(html, 'property="og:url"', 1, `out/${route.file}`);
  assertIncludes(
    html,
    `property="og:url" content="${route.canonical}"`,
    `out/${route.file}`,
  );
  assertIncludes(html, "data-mado-static", `out/${route.file}`);
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
    `${scripts.length} JavaScript assets and Cloudflare packaging`,
);
