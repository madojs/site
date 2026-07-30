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
  },
  {
    file: "start/index.html",
    canonical: "https://madojs.dev/start",
    copy: "From an empty directory to a running Mado app.",
  },
  {
    file: "why/index.html",
    canonical: "https://madojs.dev/why",
    copy: "Frontend infrastructure should not become the product.",
  },
  {
    file: "proof/index.html",
    canonical: "https://madojs.dev/proof",
    copy: "The claims are inspectable.",
  },
];

for (const route of routes) {
  const html = read(route.file);
  assertIncludes(html, route.copy, `out/${route.file}`);
  assertIncludes(
    html,
    `<link rel="canonical" href="${route.canonical}"`,
    `out/${route.file}`,
  );
  assertIncludes(html, "data-mado-static", `out/${route.file}`);
}

const redirects = read("_redirects");
if (redirects.includes("/* /_mado/spa.html 200")) {
  fail("out/_redirects contains Mado's catch-all SPA rewrite");
}

const fallback = read("_mado/spa.html");
assertIncludes(fallback, 'name="robots"', "out/_mado/spa.html");
assertIncludes(fallback, "noindex", "out/_mado/spa.html");

const notFound = read("404.html");
assertIncludes(notFound, 'name="robots"', "out/404.html");
assertIncludes(notFound, "noindex", "out/404.html");

const sitemap = read("sitemap.xml");
for (const route of routes) {
  const sitemapUrl = route.canonical.replace(/\/$/, "");
  assertIncludes(sitemap, `<loc>${sitemapUrl}</loc>`, "out/sitemap.xml");
}

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
