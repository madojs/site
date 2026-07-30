import { execFileSync, spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const productionUrl = "https://madojs.dev";
const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
const wranglerConfigPath = join(root, "wrangler.jsonc");
const wranglerConfig = JSON.parse(readFileSync(wranglerConfigPath, "utf8"));
const expectedAccountId = wranglerConfig.account_id;

if (process.versions.node.split(".")[0] !== "24") {
  fail(`production deploys require Node 24, received ${process.versions.node}`);
}
if (!/^[a-f0-9]{32}$/u.test(expectedAccountId ?? "")) {
  fail("wrangler.jsonc must pin the expected Cloudflare account_id");
}

for (const name of [
  "CLOUDFLARE_API_KEY",
  "CLOUDFLARE_API_BASE_URL",
  "CLOUDFLARE_API_TOKEN",
  "CLOUDFLARE_EMAIL",
  "CLOUDFLARE_ENV",
  "CLOUDFLARE_ACCOUNT_ID",
  "CF_API_BASE_URL",
  "CF_API_KEY",
  "CF_API_TOKEN",
  "CF_EMAIL",
  "CF_ACCOUNT_ID",
  "WRANGLER_ENV",
]) {
  if (process.env[name]) {
    fail(
      `${name} must be unset; production uses Wrangler OAuth and the pinned account_id`,
    );
  }
}

for (const name of ["MADO_BROWSER_CHANNEL", "MADO_BROWSER_PATH"]) {
  if (process.env[name]) {
    fail(
      `${name} must be unset; production verification uses the ` +
        "Playwright-managed Chromium revision pinned by package-lock.json",
    );
  }
}

for (const name of [
  ".env",
  ".env.local",
  ".env.production",
  ".env.production.local",
]) {
  if (existsSync(join(root, name))) {
    fail(`${name} is not allowed during a reproducible production deploy`);
  }
}

const wranglerEnv = {
  ...process.env,
  CLOUDFLARE_ACCOUNT_ID: expectedAccountId,
  WRANGLER_LOG_PATH:
    process.env.WRANGLER_LOG_PATH ??
    join(tmpdir(), "madojs-site-wrangler.log"),
  WRANGLER_SEND_METRICS: process.env.WRANGLER_SEND_METRICS ?? "false",
};

process.chdir(root);

const branch = git(["branch", "--show-current"]);
if (branch !== "main") {
  fail(`production deploys must run from main, received ${branch || "detached HEAD"}`);
}

requireCleanTree("before deployment");

const head = requirePublishedHead();

console.log(`[site deploy] preparing ${head} for ${productionUrl}`);

runNpm(["ci"]);
runNpm(["exec", "--", "playwright-core", "install", "chromium"]);
runNpm(["run", "verify"]);
runNpm(["run", "test:browser"]);
runNpm(["run", "release"]);
runNpm(["run", "verify:release"]);
writeDeploymentManifest(head);
runNpm(
  [
    "exec",
    "--",
    "wrangler",
    "deploy",
    "--config",
    "wrangler.jsonc",
    "--dry-run",
  ],
  wranglerEnv,
);
requireCleanTree("after release verification");
if (requirePublishedHead() !== head) {
  fail("HEAD changed while preparing the production release");
}
runNpm(
  [
    "exec",
    "--",
    "wrangler",
    "deploy",
    "--config",
    "wrangler.jsonc",
    "--message",
    `GitHub commit ${head}`,
  ],
  wranglerEnv,
);
runNpm(["run", "verify:edge"], {
  ...process.env,
  MADO_EDGE_ATTEMPTS: process.env.MADO_EDGE_ATTEMPTS ?? "12",
  MADO_EDGE_RETRY_MS: process.env.MADO_EDGE_RETRY_MS ?? "5000",
  MADO_EDGE_COMMIT: head,
  MADO_EDGE_URL: productionUrl,
});

console.log(`[site deploy] deployed and verified ${head} at ${productionUrl}`);

function git(args, fallbackMessage) {
  try {
    return execFileSync("git", args, {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }).trim();
  } catch {
    fail(fallbackMessage ?? `git ${args.join(" ")} failed`);
  }
}

function requireCleanTree(stage) {
  const status = git(["status", "--porcelain", "--untracked-files=all"]);
  if (status) {
    fail(`working tree must be clean ${stage}:\n${status}`);
  }
}

function requirePublishedHead() {
  git(
    [
      "fetch",
      "--quiet",
      "origin",
      "+refs/heads/main:refs/remotes/origin/main",
    ],
    "could not refresh origin/main before deployment",
  );
  const head = git(["rev-parse", "HEAD"]);
  const originMain = git(
    ["rev-parse", "--verify", "origin/main"],
    "origin/main is unavailable; fetch or push the repository first",
  );
  if (head !== originMain) {
    fail(
      `HEAD ${head.slice(0, 12)} does not match origin/main ${originMain.slice(0, 12)}; ` +
        "push the exact commit before deploying it",
    );
  }
  return head;
}

function writeDeploymentManifest(head) {
  const directory = join(root, "out", "_mado");
  mkdirSync(directory, { recursive: true });
  writeFileSync(
    join(directory, "deployment.json"),
    `${JSON.stringify({ commit: head, schema: 1 }, null, 2)}\n`,
  );
}

function runNpm(args, env = process.env) {
  const result = spawnSync(npmCommand, args, {
    cwd: root,
    env,
    stdio: "inherit",
  });
  if (result.error) {
    fail(`${npmCommand} ${args.join(" ")} failed: ${result.error.message}`);
  }
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function fail(message) {
  console.error(`[site deploy] ${message}`);
  process.exit(1);
}
