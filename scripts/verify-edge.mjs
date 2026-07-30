import { readdirSync } from "node:fs";
import { resolve } from "node:path";

const baseUrl = process.env.MADO_EDGE_URL ?? "http://127.0.0.1:8791";
const outAssets = resolve(import.meta.dirname, "../out/assets");

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
if (!unknown.body.includes('name="robots" content="noindex"')) {
  fail("unknown route did not use the noindex 404 document");
}

const head = await request("/proof", { method: "HEAD" });
expectStatus(head, 200, "HEAD /proof");
if (head.body !== "") fail("HEAD /proof returned a response body");

console.log(
  `[site edge] verified static routes, trailing-slash policy, assets and 404 at ${baseUrl}`,
);
