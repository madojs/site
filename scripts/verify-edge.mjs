import { readFileSync, readdirSync } from "node:fs";
import { createRequire } from "node:module";
import { join, resolve } from "node:path";

import {
  createProofContract,
  proofDisplayRows,
  RELEASE_MANIFEST_SCHEMA_VERSION,
} from "./proof-contract.mjs";
import { authoredRoutes } from "../src/authored-routes.ts";

const baseUrl = process.env.MADO_EDGE_URL ?? "http://127.0.0.1:8791";
const root = resolve(import.meta.dirname, "..");
const outAssets = join(root, "out/assets");
const attempts = positiveInteger(process.env.MADO_EDGE_ATTEMPTS, 1);
const retryMs = positiveInteger(process.env.MADO_EDGE_RETRY_MS, 1_000);
const expectedCommit = process.env.MADO_EDGE_COMMIT;
const releaseContract = readReleaseContract();
const docsRoutes = releaseContract.docsRoutes;

const fail = (message) => {
  throw new Error(`[site edge] ${message}`);
};

const request = async (pathname, init = {}) => {
  const response = await fetch(`${baseUrl}${pathname}`, {
    redirect: "manual",
    ...init,
  });
  return {
    response,
    body: init.method === "HEAD" ? "" : await response.text(),
  };
};

const expectStatus = ({ response }, expected, pathname) => {
  if (response.status !== expected) {
    fail(`${pathname} returned ${response.status}, expected ${expected}`);
  }
};

for (let attempt = 1; attempt <= attempts; attempt += 1) {
  try {
    await verifyEdge();
    break;
  } catch (error) {
    if (attempt === attempts) throw error;
    console.warn(
      `[site edge] attempt ${attempt}/${attempts} failed: ${error.message}`,
    );
    await new Promise((resolveDelay) => setTimeout(resolveDelay, retryMs));
  }
}

async function verifyEdge() {
  const publicRoutes = [
    ["/", "A frontend framework you can own."],
    ["/start", "From an empty directory to a running Mado app."],
    ["/why", "Frontend infrastructure should not become the product."],
    ["/proof", "The claims are inspectable."],
    ...docsRoutes.map((route) => [route.path, route.title]),
  ];

  for (const [pathname, title] of publicRoutes) {
    const result = await request(pathname);
    expectStatus(result, 200, pathname);
    if (exactH1(result.body) !== title) {
      fail(`${pathname} did not serve its captured document`);
    }
    if (
      pathname.startsWith("/docs") &&
      !result.body.includes("data-docs-document")
    ) {
      fail(`${pathname} did not serve the captured documentation article`);
    }
    if (pathname === "/proof") {
      assertRenderedProof(result.body, releaseContract.proof);
    }
  }

  for (const pathname of ["/start", "/docs"]) {
    const trailingSlash = await request(`${pathname}/`);
    if (![301, 302, 307, 308].includes(trailingSlash.response.status)) {
      fail(
        `${pathname}/ returned ${trailingSlash.response.status}, ` +
          "expected redirect",
      );
    }
    const redirectLocation = trailingSlash.response.headers.get("location");
    if (redirectLocation !== pathname) {
      fail(
        `${pathname}/ redirected to ${String(redirectLocation)}, ` +
          `expected ${pathname}`,
      );
    }
  }

  const entryScript = readdirSync(outAssets).find(
    (name) => name.startsWith("index-") && name.endsWith(".js"),
  );
  if (!entryScript) fail("could not locate the hashed entry script");

  const script = await request(`/assets/${entryScript}`);
  expectStatus(script, 200, `/assets/${entryScript}`);
  const scriptType = script.response.headers.get("content-type") ?? "";
  if (!scriptType.includes("javascript")) {
    fail(`entry script has unexpected content-type ${scriptType}`);
  }
  if (script.body.toLowerCase().includes("<!doctype")) {
    fail("entry script returned HTML");
  }

  const missingAsset = await request("/missing.js");
  expectStatus(missingAsset, 404, "/missing.js");

  const llms = await request("/llms.txt");
  expectStatus(llms, 200, "/llms.txt");
  const expectedLlms = readFileSync(join(root, "out/llms.txt"), "utf8");
  if (llms.body !== expectedLlms) {
    fail("/llms.txt differs from the verified release artifact");
  }

  const unknown = await request("/route-that-does-not-exist");
  expectStatus(unknown, 404, "/route-that-does-not-exist");
  const robots = unknown.body.match(
    /<meta\b[^>]*\bname=["']robots["'][^>]*>/i,
  )?.[0];
  if (!robots || !/\bnoindex\b/i.test(robots)) {
    fail("unknown route did not use the noindex 404 document");
  }
  if (
    !unknown.body.includes("Page not found") ||
    !unknown.body.includes("data-mado-static-fallback")
  ) {
    fail("unknown route did not serve the captured site 404");
  }

  const head = await request("/proof", { method: "HEAD" });
  expectStatus(head, 200, "HEAD /proof");
  if (head.body !== "") fail("HEAD /proof returned a response body");

  if (expectedCommit) {
    const deployment = await request("/_mado/deployment.json");
    expectStatus(deployment, 200, "/_mado/deployment.json");
    let manifest;
    try {
      manifest = JSON.parse(deployment.body);
    } catch {
      fail("deployment manifest is not valid JSON");
    }
    if (manifest.commit !== expectedCommit) {
      fail(
        `edge serves commit ${String(manifest.commit)}, expected ${expectedCommit}`,
      );
    }
  }

  console.log(
    `[site edge] verified ${publicRoutes.length} public static routes, ` +
      `llms.txt, trailing-slash policy, assets and 404 at ${baseUrl}`,
  );
}

function readReleaseContract() {
  const path = join(root, "src/generated/docs/release-manifest.json");
  let manifest;
  try {
    manifest = JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    throw new Error(
      `[site edge] could not read documentation release manifest: ${error.message}`,
    );
  }
  if (manifest.schemaVersion !== RELEASE_MANIFEST_SCHEMA_VERSION) {
    throw new Error(
      `[site edge] unsupported documentation manifest schema ${String(
        manifest.schemaVersion,
      )}`,
    );
  }

  const documents = Array.isArray(manifest.routes)
    ? manifest.routes
    : manifest.documents;
  if (!Array.isArray(documents) || documents.length === 0) {
    throw new Error("[site edge] documentation manifest contains no documents");
  }
  const candidates = [...(manifest.home ? [manifest.home] : []), ...documents];
  const routes = [];
  const seen = new Set();
  for (const [index, entry] of candidates.entries()) {
    const path = entry?.path ?? entry?.route;
    if (
      typeof path !== "string" ||
      !/^\/docs(?:\/[a-z0-9]+(?:[.-][a-z0-9]+)*)*$/.test(path)
    ) {
      throw new Error(
        `[site edge] documentation entry ${index} has invalid route ${String(
          path,
        )}`,
      );
    }
    if (typeof entry.title !== "string" || entry.title.trim() === "") {
      throw new Error(
        `[site edge] documentation route ${path} has no title`,
      );
    }
    if (!seen.has(path)) routes.push({ path, title: entry.title });
    seen.add(path);
  }
  if (!seen.has("/docs")) {
    throw new Error("[site edge] documentation manifest does not declare /docs");
  }

  const require = createRequire(import.meta.url);
  const installedPackage = JSON.parse(
    readFileSync(require.resolve("@madojs/mado/package.json"), "utf8"),
  );
  const proof = createProofContract({
    authoredRoutePaths: Object.keys(authoredRoutes),
    documentationRoutePaths: routes.map((route) => route.path),
    framework: {
      package: "@madojs/mado",
      version: installedPackage.version,
      tag: `v${installedPackage.version}`,
      repository: "https://github.com/madojs/mado",
      metadata: "@madojs/mado/package.json",
    },
    root,
  });
  if (JSON.stringify(manifest.proof) !== JSON.stringify(proof)) {
    throw new Error(
      "[site edge] generated proof contract differs from local release inputs",
    );
  }
  return { docsRoutes: routes, proof };
}

function assertRenderedProof(html, proof) {
  const section = html.match(
    /<section\b[^>]*\bdata-proof-contract=["']([^"']+)["'][^>]*>/i,
  );
  if (section?.[1] !== String(proof.schemaVersion)) {
    fail("/proof served a stale proof contract schema");
  }

  const renderedRows = [...html.matchAll(
    /<p\b([^>]*\bdata-proof-row(?:\s*=|\b)[^>]*)>([\s\S]*?)<\/p>/giu,
  )];
  const expectedRows = proofDisplayRows(proof);
  if (renderedRows.length !== expectedRows.length) {
    fail(
      `/proof served ${renderedRows.length} proof rows, ` +
        `expected ${expectedRows.length}`,
    );
  }
  for (const expected of expectedRows) {
    const matching = renderedRows.find(
      ([, attributes]) =>
        attribute(attributes, "data-proof-row") === expected.id,
    );
    if (
      !matching ||
      decodeHtml(attribute(matching[1], "data-proof-value") ?? "") !==
        expected.value ||
      decodeHtml(attribute(matching[1], "data-proof-status") ?? "") !==
        expected.status ||
      normalizeText(matching[2]) !==
        `${expected.label} ${expected.value} ${expected.status}`
    ) {
      fail(`/proof served stale content for ${expected.id}`);
    }
  }
}

function exactH1(html) {
  const matches = [...html.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi)];
  if (matches.length !== 1) return undefined;
  return decodeHtml(
    matches[0][1].replace(/<br\s*\/?>/gi, " ").replace(/<[^>]*>/g, ""),
  )
    .replace(/\s+/g, " ")
    .trim();
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

function positiveInteger(value, fallback) {
  if (value === undefined) return fallback;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isSafeInteger(parsed) || parsed < 1) {
    throw new Error(`[site edge] expected a positive integer, received ${value}`);
  }
  return parsed;
}
