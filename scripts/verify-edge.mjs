import { readdirSync } from "node:fs";
import { resolve } from "node:path";

const baseUrl = process.env.MADO_EDGE_URL ?? "http://127.0.0.1:8791";
const outAssets = resolve(import.meta.dirname, "../out/assets");
const attempts = positiveInteger(process.env.MADO_EDGE_ATTEMPTS, 1);
const retryMs = positiveInteger(process.env.MADO_EDGE_RETRY_MS, 1_000);
const expectedCommit = process.env.MADO_EDGE_COMMIT;

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
  for (const [pathname, copy] of [
    ["/", "A frontend framework you can own."],
    ["/start", "From an empty directory to a running Mado app."],
    ["/why", "Frontend infrastructure should not become the product."],
    ["/proof", "The claims are inspectable."],
  ]) {
    const result = await request(pathname);
    expectStatus(result, 200, pathname);
    if (!result.body.includes(copy)) {
      fail(`${pathname} did not serve its captured document`);
    }
  }

  const trailingSlash = await request("/start/");
  if (![301, 302, 307, 308].includes(trailingSlash.response.status)) {
    fail(`/start/ returned ${trailingSlash.response.status}, expected redirect`);
  }
  const redirectLocation = trailingSlash.response.headers.get("location");
  if (redirectLocation !== "/start") {
    fail(`/start/ redirected to ${String(redirectLocation)}, expected /start`);
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
    `[site edge] verified static routes, trailing-slash policy, assets and 404 at ${baseUrl}`,
  );
}

function positiveInteger(value, fallback) {
  if (value === undefined) return fallback;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isSafeInteger(parsed) || parsed < 1) {
    throw new Error(`[site edge] expected a positive integer, received ${value}`);
  }
  return parsed;
}
