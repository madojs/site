import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";

import { chromium } from "playwright-core";
import { createServer } from "vite";

const root = resolve(import.meta.dirname, "../..");
const docsRoutes = readDocsRoutes();
const errors = [];
let browser;
let server;

try {
  server = await createServer({
    root,
    logLevel: "error",
    server: {
      host: "127.0.0.1",
      port: 0,
      strictPort: false,
    },
  });
  await server.listen();

  const address = server.httpServer?.address();
  if (!address || typeof address === "string") {
    throw new Error("Vite did not expose a local address");
  }
  const origin = `http://127.0.0.1:${address.port}`;

  const launchOptions = { headless: true };
  if (process.env.MADO_BROWSER_PATH) {
    launchOptions.executablePath = process.env.MADO_BROWSER_PATH;
  } else if (process.env.MADO_BROWSER_CHANNEL) {
    launchOptions.channel = process.env.MADO_BROWSER_CHANNEL;
  }
  browser = await chromium.launch(launchOptions);

  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    permissions: ["clipboard-read", "clipboard-write"],
    reducedMotion: "reduce",
  });
  const page = await context.newPage();
  collectBrowserErrors(page, errors);

  const response = await page.goto(origin, { waitUntil: "networkidle" });
  assert.equal(response?.status(), 200);
  await page.waitForSelector(".home-hero h1");

  assert.equal(await page.locator("main").count(), 1);
  assert.equal(await page.locator("h1").count(), 1);
  assert.equal(
    await page.locator("h1").textContent(),
    "A frontend framework you can own.",
  );
  assert.equal(await page.locator(".site-header").count(), 1);
  assert.equal(await page.locator(".site-footer").count(), 1);
  assert.equal(
    await page.locator("#site-primary-navigation").evaluate((navigation) =>
      navigation.querySelectorAll(
        '[role="menu"], [role="menubar"], [role="tree"]',
      ).length
    ),
    0,
  );

  await page
    .locator('#site-primary-navigation a[href="/start"]')
    .click();
  await page.waitForURL(`${origin}/start`);
  await page.waitForSelector(".site-page-header h1");
  assert.match(await page.title(), /^Start · Mado$/);
  assert.equal(
    await page.locator("#site-primary-navigation a[href='/start']")
      .getAttribute("aria-current"),
    "page",
  );
  assert.equal(
    await page.evaluate(() => document.activeElement?.id),
    "main-content",
  );

  const firstCopy = page.locator(".site-copy-button").first();
  await firstCopy.click();
  await firstCopy.getByText("Copied", { exact: true }).waitFor();

  await page.setViewportSize({ width: 390, height: 844 });
  const menuTrigger = page.locator(".site-menu-trigger");
  assert.equal(await menuTrigger.isVisible(), true);
  await menuTrigger.click();
  await page.locator("#site-mobile-menu:popover-open").waitFor();
  await page
    .locator('#site-mobile-navigation a[href="/why"]')
    .click();
  await page.waitForURL(`${origin}/why`);
  await page.waitForSelector(".why-thesis");
  assert.equal(
    await page.locator("#site-mobile-menu:popover-open").count(),
    0,
  );
  assert.equal(
    await page.locator("#site-mobile-navigation a[href='/why']")
      .getAttribute("aria-current"),
    "page",
  );
  assert.equal(
    await page.evaluate(() => document.activeElement?.id),
    "main-content",
  );

  const directDoc = docsRoutes[0];
  const nextDoc = docsRoutes[1];
  await page.setViewportSize({ width: 1440, height: 1000 });
  const docsResponse = await page.goto(`${origin}${directDoc.path}`, {
    waitUntil: "networkidle",
  });
  assert.equal(docsResponse?.status(), 200);
  await page.waitForSelector("[data-docs-document] h1");
  assert.equal(await page.locator("main").count(), 1);
  assert.equal(await page.locator("h1").count(), 1);
  assert.equal(
    (await page.locator("[data-docs-document] h1").textContent())?.trim(),
    directDoc.title,
  );
  assert.equal(await page.locator("[data-docs-shell]").count(), 1);
  assert.equal(
    await page
      .locator('[data-docs-toc][data-placement="rail"]')
      .isVisible(),
    true,
  );
  assert.equal(
    await page
      .locator('[data-docs-toc][data-placement="inline"]')
      .isVisible(),
    false,
  );
  assert.equal(
    await page
      .locator(`[data-docs-sidebar] a[href="${directDoc.path}"]`)
      .getAttribute("aria-current"),
    "page",
  );
  assert.equal(
    await page.locator("[data-docs-document] [data-doc-route]").count(),
    0,
  );

  const generatedInlineLink = page
    .locator(
      '[data-docs-document] .docs-generated-body ' +
        'a[data-link][href^="/docs/"]',
    )
    .first();
  assert.equal(await generatedInlineLink.count(), 1);
  const generatedInlineHref = await generatedInlineLink.getAttribute("href");
  assert.match(generatedInlineHref ?? "", /^\/docs\/[a-z0-9.-]+(?:#.*)?$/);
  await generatedInlineLink.click();
  await page.waitForURL(`${origin}${generatedInlineHref}`);
  assert.equal(
    await page.evaluate(() => document.activeElement?.id),
    "main-content",
  );

  await page
    .locator(`[data-docs-sidebar] a[href="${nextDoc.path}"]`)
    .click();
  await page.waitForURL(`${origin}${nextDoc.path}`);
  await page.waitForSelector("[data-docs-document] h1");
  assert.equal(
    (await page.locator("[data-docs-document] h1").textContent())?.trim(),
    nextDoc.title,
  );
  assert.equal(
    await page
      .locator(`[data-docs-sidebar] a[href="${nextDoc.path}"]`)
      .getAttribute("aria-current"),
    "page",
  );
  assert.equal(
    await page.evaluate(() => document.activeElement?.id),
    "main-content",
  );

  const headingLink = page
    .locator(
      `[data-docs-toc][data-placement="rail"] ` +
        `a[href^="${nextDoc.path}#"]`,
    )
    .first();
  const headingHref = await headingLink.getAttribute("href");
  assert.match(headingHref ?? "", new RegExp(`^${nextDoc.path}#[a-z0-9.-]+$`));
  await headingLink.click();
  await page.waitForURL(`${origin}${headingHref}`);
  const headingId = headingHref?.split("#")[1];
  assert.equal(
    await page.locator(`[id="${headingId}"]`).count(),
    1,
  );

  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(
    await page
      .locator('[data-docs-toc][data-placement="rail"]')
      .isVisible(),
    false,
  );
  assert.equal(
    await page
      .locator('[data-docs-toc][data-placement="inline"]')
      .isVisible(),
    true,
  );
  const docsMobile = page.locator("details[data-docs-mobile]");
  assert.equal(await docsMobile.count(), 1);
  assert.equal(
    await docsMobile.evaluate(
      (element) => element instanceof HTMLDetailsElement,
    ),
    true,
  );
  assert.equal(await docsMobile.getAttribute("open"), null);
  await docsMobile.locator(":scope > summary").click();
  assert.equal(await docsMobile.getAttribute("open"), "");

  await page.setViewportSize({ width: 320, height: 900 });
  await page.evaluate(() => {
    document.documentElement.style.fontSize = "200%";
  });
  const docsReflow = await collectReflow(page, [
    ".site-shell",
    ".site-main",
    "[data-docs-shell]",
    "[data-docs-document]",
    "[data-docs-mobile]",
    "[data-docs-toc]",
  ]);
  assert.ok(
    docsReflow.scrollWidth <= docsReflow.clientWidth,
    JSON.stringify(docsReflow),
  );
  assert.equal(
    docsReflow.bounds.every(({ left, right }) =>
      left >= -0.5 && right <= docsReflow.clientWidth + 0.5
    ),
    true,
    JSON.stringify(docsReflow),
  );
  await page.evaluate(() => {
    document.documentElement.style.removeProperty("font-size");
  });

  await page.goto(origin, { waitUntil: "networkidle" });
  await page.setViewportSize({ width: 320, height: 900 });
  await page.evaluate(() => {
    document.documentElement.style.fontSize = "200%";
  });
  const reflow = await page.evaluate(() => {
    const viewportWidth = document.documentElement.clientWidth;
    const selectors = [
      ".site-shell",
      ".site-header",
      ".site-main",
      ".home-hero",
      ".home-proof-window",
      ".site-footer",
    ];
    const bounds = selectors.map((selector) => {
      const element = document.querySelector(selector);
      if (!(element instanceof HTMLElement)) {
        throw new Error(`Missing reflow element ${selector}`);
      }
      const rect = element.getBoundingClientRect();
      return {
        clientWidth: element.clientWidth,
        left: rect.left,
        right: rect.right,
        scrollWidth: element.scrollWidth,
        selector,
      };
    });
    const overflowingCode = document.querySelector(
      ".home-dogfood .site-code-example code",
    );
    const overflowChain = [];
    let current = overflowingCode;
    while (current instanceof HTMLElement && overflowChain.length < 8) {
      const style = getComputedStyle(current);
      const rect = current.getBoundingClientRect();
      overflowChain.push({
        className: current.className,
        clientWidth: current.clientWidth,
        overflowX: style.overflowX,
        right: rect.right,
        scrollWidth: current.scrollWidth,
        tag: current.tagName,
        width: rect.width,
      });
      current = current.parentElement;
    }
    return {
      bounds,
      clientWidth: viewportWidth,
      offenders: [...document.querySelectorAll("*")]
        .filter((element) => {
          const rect = element.getBoundingClientRect();
          return rect.left < -0.5 || rect.right > viewportWidth + 0.5;
        })
        .slice(0, 12)
        .map((element) => {
          const rect = element.getBoundingClientRect();
          return {
            className:
              element instanceof HTMLElement ? element.className : "",
            left: rect.left,
            right: rect.right,
            tag: element.tagName,
            text: element.textContent?.trim().slice(0, 60),
          };
        }),
      overflowChain,
      scrollWidth: document.documentElement.scrollWidth,
    };
  });
  assert.ok(
    reflow.scrollWidth <= reflow.clientWidth,
    JSON.stringify(reflow),
  );
  assert.equal(
    reflow.bounds.every(({ left, right }) =>
      left >= -0.5 && right <= reflow.clientWidth + 0.5
    ),
    true,
    JSON.stringify(reflow),
  );

  await page.evaluate(() => {
    document.documentElement.style.removeProperty("font-size");
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${origin}/does-not-exist`, {
    waitUntil: "networkidle",
  });
  assert.equal(
    await page.locator("h1").textContent(),
    "Page not found",
  );
  assert.equal(
    await page.locator('meta[name="robots"]').getAttribute("content"),
    "noindex, nofollow",
  );

  if (process.env.MADO_SCREENSHOTS === "1") {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto(origin, { waitUntil: "networkidle" });
    await page.screenshot({
      path: "/tmp/madojs-site-home-desktop.png",
      fullPage: true,
    });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({
      path: "/tmp/madojs-site-home-mobile.png",
      fullPage: true,
    });
  }

  assert.deepEqual(errors, []);
  process.stdout.write("[mado site] browser smoke passed\n");
} finally {
  await browser?.close();
  await server?.close();
}

function collectBrowserErrors(page, errors) {
  page.on("console", (message) => {
    if (message.type() === "error") {
      errors.push(`console: ${message.text()}`);
    }
  });
  page.on("pageerror", (error) => {
    errors.push(`pageerror: ${error.message}`);
  });
  page.on("requestfailed", (request) => {
    errors.push(
      `requestfailed: ${request.url()} ${request.failure()?.errorText ?? ""}`,
    );
  });
}

function readDocsRoutes() {
  const path = join(root, "src/generated/docs/release-manifest.json");
  let manifest;
  try {
    manifest = JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    throw new Error(
      `[mado site] could not read documentation release manifest: ${error.message}`,
    );
  }
  if (manifest.schemaVersion !== 1) {
    throw new Error(
      `[mado site] unsupported documentation manifest schema ${String(
        manifest.schemaVersion,
      )}`,
    );
  }
  const candidates = Array.isArray(manifest.routes)
    ? manifest.routes
    : manifest.documents;
  if (!Array.isArray(candidates) || candidates.length < 2) {
    throw new Error(
      "[mado site] documentation manifest needs at least two documents",
    );
  }
  return candidates.slice(0, 2).map((entry, index) => {
    const path = entry?.path ?? entry?.route;
    if (
      typeof path !== "string" ||
      !/^\/docs\/[a-z0-9]+(?:[.-][a-z0-9]+)*$/.test(path)
    ) {
      throw new Error(
        `[mado site] documentation entry ${index} has invalid route`,
      );
    }
    if (typeof entry.title !== "string" || entry.title.trim() === "") {
      throw new Error(
        `[mado site] documentation route ${path} has no title`,
      );
    }
    return { path, title: entry.title };
  });
}

async function collectReflow(page, selectors) {
  return page.evaluate((expectedSelectors) => {
    const viewportWidth = document.documentElement.clientWidth;
    const bounds = expectedSelectors.flatMap((selector) => {
      const element = document.querySelector(selector);
      if (!(element instanceof HTMLElement) || element.hidden) return [];
      const style = getComputedStyle(element);
      if (style.display === "none") return [];
      const rect = element.getBoundingClientRect();
      return [{
        clientWidth: element.clientWidth,
        left: rect.left,
        right: rect.right,
        scrollWidth: element.scrollWidth,
        selector,
      }];
    });
    return {
      bounds,
      clientWidth: viewportWidth,
      offenders: [...document.querySelectorAll("*")]
        .filter((element) => {
          const rect = element.getBoundingClientRect();
          return rect.left < -0.5 || rect.right > viewportWidth + 0.5;
        })
        .slice(0, 12)
        .map((element) => {
          const rect = element.getBoundingClientRect();
          return {
            className:
              element instanceof HTMLElement ? element.className : "",
            left: rect.left,
            right: rect.right,
            tag: element.tagName,
            text: element.textContent?.trim().slice(0, 60),
          };
        }),
      scrollWidth: document.documentElement.scrollWidth,
    };
  }, selectors);
}
