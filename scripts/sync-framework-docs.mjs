import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  realpathSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import {
  dirname,
  isAbsolute,
  join,
  relative,
  resolve,
  sep,
} from "node:path";
import { fileURLToPath } from "node:url";

import { marked } from "marked";

import {
  createProofContract,
  proofDisplayRows,
  RELEASE_MANIFEST_SCHEMA_VERSION,
} from "./proof-contract.mjs";
import { authoredRoutes } from "../src/authored-routes.ts";

const root = resolve(import.meta.dirname, "..");
const updateLlms = parseArguments(process.argv.slice(2));
const packageName = "@madojs/mado";
const repository = "https://github.com/madojs/mado";

const sitePackage = readJson(join(root, "package.json"), "site package.json");
const manifestPath = resolvePublicFile(
  `${packageName}/docs/en/manifest.json`,
  "documentation manifest",
);
const frameworkPackagePath = resolvePublicFile(
  `${packageName}/package.json`,
  "package metadata",
);
const docsDirectory = realpathSync(dirname(manifestPath));
const packageRoot = realpathSync(dirname(frameworkPackagePath));
const frameworkPackage = readJson(
  frameworkPackagePath,
  `${packageName} package.json`,
);
const llmsPath = resolvePublicFile(`${packageName}/llms.txt`, "llms.txt");

assertInside(packageRoot, frameworkPackagePath, "package metadata");
assertInside(packageRoot, manifestPath, "documentation manifest");
assertInside(packageRoot, llmsPath, "llms.txt");
assertExactPackage(frameworkPackage, sitePackage);

const frameworkVersion = frameworkPackage.version;
const manifest = validateManifest(
  readJson(manifestPath, "documentation manifest"),
);
const documents = readDocuments(manifest);
const documentsByPath = new Map(
  documents.map((document) => [document.sourcePath, document]),
);

for (const document of documents) {
  prepareDocument(document);
}
for (const document of documents) {
  validateAndRewriteReferences(document, documentsByPath);
  document.html = renderDocument(document);
}

const llms = readFileSync(llmsPath);
syncLlms(llms);
writeGeneratedOutput(documents, manifest, llms);

console.log(
  `[site docs] synced ${documents.length} documents from ` +
    `${packageName} ${frameworkVersion}`,
);

function parseArguments(arguments_) {
  const known = new Set(["--update-llms"]);
  for (const argument of arguments_) {
    if (!known.has(argument)) {
      fail(`unknown argument ${JSON.stringify(argument)}`);
    }
  }
  return arguments_.includes("--update-llms");
}

function resolvePublicFile(specifier, label) {
  let url;
  try {
    url = import.meta.resolve(specifier);
  } catch (error) {
    fail(`could not resolve public ${label}: ${error.message}`);
  }
  if (!url.startsWith("file:")) {
    fail(`public ${label} did not resolve to a local file`);
  }

  const path = fileURLToPath(url);
  if (!existsSync(path) || !statSync(path).isFile()) {
    fail(`public ${label} is not a file at ${path}`);
  }
  return realpathSync(path);
}

function readJson(path, label) {
  let value;
  try {
    value = JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    fail(`${label} is not valid JSON: ${error.message}`);
  }
  if (!isPlainObject(value)) {
    fail(`${label} must contain a JSON object`);
  }
  return value;
}

function assertExactPackage(framework, site) {
  if (framework.name !== packageName) {
    fail(
      `resolved package is ${JSON.stringify(framework.name)}, ` +
        `expected ${packageName}`,
    );
  }
  if (
    typeof framework.version !== "string" ||
    !/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/u.test(
      framework.version,
    )
  ) {
    fail(`installed ${packageName} has an invalid version`);
  }

  const declared = site.dependencies?.[packageName];
  if (declared !== framework.version) {
    fail(
      `${packageName} must be pinned exactly: package.json declares ` +
        `${JSON.stringify(declared)}, installed package is ${framework.version}`,
    );
  }
}

function validateManifest(value) {
  exactKeys(
    value,
    ["schemaVersion", "locale", "sections"],
    "documentation manifest",
  );
  if (value.schemaVersion !== 1) {
    fail(
      `unsupported documentation manifest schema ${String(
        value.schemaVersion,
      )}`,
    );
  }
  if (value.locale !== "en") {
    fail(`unsupported documentation locale ${JSON.stringify(value.locale)}`);
  }
  if (!Array.isArray(value.sections) || value.sections.length === 0) {
    fail("documentation manifest must contain sections");
  }

  const sectionIds = new Set();
  const slugs = new Set();
  const files = new Set();
  for (const [sectionIndex, section] of value.sections.entries()) {
    const context = `documentation section ${sectionIndex}`;
    if (!isPlainObject(section)) fail(`${context} must be an object`);
    exactKeys(section, ["id", "title", "entries"], context);
    if (
      typeof section.id !== "string" ||
      !/^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(section.id)
    ) {
      fail(`${context} has an invalid id`);
    }
    if (sectionIds.has(section.id)) {
      fail(`duplicate documentation section id ${section.id}`);
    }
    sectionIds.add(section.id);
    nonEmptyString(section.title, `${context} title`);
    if (!Array.isArray(section.entries) || section.entries.length === 0) {
      fail(`${context} must contain entries`);
    }

    for (const [entryIndex, entry] of section.entries.entries()) {
      const entryContext = `${context} entry ${entryIndex}`;
      if (!isPlainObject(entry)) {
        fail(`${entryContext} must be an object`);
      }
      exactKeys(entry, ["slug", "file"], entryContext);
      if (
        typeof entry.slug !== "string" ||
        !/^[a-z0-9]+(?:[.-][a-z0-9]+)*$/u.test(entry.slug)
      ) {
        fail(`${entryContext} has an invalid slug`);
      }
      if (
        typeof entry.file !== "string" ||
        !/^\d{2}-[a-z0-9]+(?:[.-][a-z0-9]+)*\.md$/u.test(entry.file)
      ) {
        fail(`${entryContext} has an invalid file`);
      }
      if (slugs.has(entry.slug)) {
        fail(`duplicate documentation slug ${entry.slug}`);
      }
      if (files.has(entry.file)) {
        fail(`duplicate documentation file ${entry.file}`);
      }
      slugs.add(entry.slug);
      files.add(entry.file);
    }
  }

  const numberedMarkdown = readdirSync(docsDirectory)
    .filter((file) => /^\d{2}-.*\.md$/u.test(file))
    .sort();
  const declaredMarkdown = [...files].sort();
  if (JSON.stringify(numberedMarkdown) !== JSON.stringify(declaredMarkdown)) {
    fail(
      "documentation manifest must cover every numbered Markdown file exactly",
    );
  }
  return value;
}

function readDocuments(value) {
  const result = [];
  for (const section of value.sections) {
    for (const entry of section.entries) {
      const candidate = resolve(docsDirectory, entry.file);
      if (!existsSync(candidate) || !statSync(candidate).isFile()) {
        fail(`documentation source ${entry.file} does not exist`);
      }
      const sourcePath = realpathSync(candidate);
      assertInside(docsDirectory, sourcePath, `documentation source ${entry.file}`);
      result.push({
        description: "",
        headingIds: new Set(),
        headingMap: new WeakMap(),
        headings: [],
        html: "",
        next: null,
        previous: null,
        references: new WeakMap(),
        sectionId: section.id,
        sectionTitle: section.title,
        slug: entry.slug,
        source: entry.file,
        sourcePath,
        sourceText: readFileSync(sourcePath, "utf8"),
        title: "",
        toc: [],
        tokens: null,
      });
    }
  }

  for (const [index, document] of result.entries()) {
    const previous = result[index - 1];
    const next = result[index + 1];
    document.previous = previous
      ? { slug: previous.slug, title: () => previous.title }
      : null;
    document.next = next ? { slug: next.slug, title: () => next.title } : null;
  }
  return result;
}

function prepareDocument(document) {
  const tokens = marked.lexer(document.sourceText, {
    gfm: true,
    pedantic: false,
  });
  const headings = [];
  marked.walkTokens(tokens, (token) => {
    if (token.type === "heading") headings.push(token);
  });

  const first = tokens.find((token) => token.type !== "space");
  const h1 = headings.filter((heading) => heading.depth === 1);
  if (first?.type !== "heading" || first.depth !== 1 || h1.length !== 1) {
    fail(`${document.source} must contain exactly one leading H1`);
  }

  document.title = plainInline(first.tokens);
  nonEmptyString(document.title, `${document.source} H1`);

  let description = "";
  marked.walkTokens(tokens, (token) => {
    if (!description && token.type === "paragraph") {
      description = plainInline(token.tokens);
    }
  });
  document.description = summarize(description);
  nonEmptyString(document.description, `${document.source} description`);

  const slugCounts = new Map();
  const usedHeadingIds = new Set();
  for (const heading of headings) {
    if (heading === first) continue;
    if (heading.depth < 2 || heading.depth > 6) {
      fail(`${document.source} contains an unsupported heading depth`);
    }
    const title = plainInline(heading.tokens);
    const base = headingSlug(title);
    let count = (slugCounts.get(base) ?? 0) + 1;
    let id = count === 1 ? base : `${base}-${count}`;
    while (usedHeadingIds.has(id)) {
      count += 1;
      id = `${base}-${count}`;
    }
    slugCounts.set(base, count);
    usedHeadingIds.add(id);
    const value = { depth: heading.depth, id, title };
    document.headingMap.set(heading, id);
    document.headingIds.add(id);
    document.headings.push(value);
    if (heading.depth === 2 || heading.depth === 3) {
      document.toc.push(value);
    }
  }

  const h1Index = tokens.indexOf(first);
  tokens.splice(h1Index, 1);
  document.tokens = tokens;
}

function validateAndRewriteReferences(document, documentsByPath) {
  marked.walkTokens(document.tokens, (token) => {
    if (token.type === "link") {
      document.references.set(
        token,
        rewriteLink(document, token.href, documentsByPath),
      );
    }
    if (token.type === "image") {
      document.references.set(
        token,
        rewriteImage(document, token.href),
      );
    }
  });
}

function rewriteLink(document, href, documentsByPath) {
  nonEmptyString(href, `${document.source} link href`);
  if (/^[A-Za-z][A-Za-z0-9+.-]*:/u.test(href)) {
    const url = safeUrl(href, `${document.source} link`);
    if (!["http:", "https:", "mailto:"].includes(url.protocol)) {
      fail(`${document.source} contains unsafe link protocol ${url.protocol}`);
    }
    return { href, internal: false };
  }
  if (href.startsWith("//")) {
    fail(`${document.source} contains a protocol-relative link`);
  }
  if (href === "/docs" || href.startsWith("/docs/")) {
    return rewriteAbsoluteDocsLink(document, href, documentsByPath);
  }
  if (href.startsWith("/")) {
    fail(`${document.source} contains unsupported root-relative link ${href}`);
  }

  const { fragment, pathname, query } = splitLocalReference(href);
  if (query) {
    fail(`${document.source} contains a local link with a query string`);
  }
  if (pathname === "") {
    validateFragment(document, fragment, document);
    return {
      href: `/docs/${document.slug}${fragment ? `#${fragment}` : ""}`,
      internal: true,
    };
  }

  const decodedPath = decodePath(pathname, `${document.source} link`);
  const candidate = resolve(dirname(document.sourcePath), decodedPath);
  if (!existsSync(candidate)) {
    fail(`${document.source} links to missing file ${pathname}`);
  }
  const targetPath = realpathSync(candidate);
  assertInside(packageRoot, targetPath, `${document.source} link ${href}`);
  const targetDocument = documentsByPath.get(targetPath);
  if (targetDocument) {
    validateFragment(document, fragment, targetDocument);
    return {
      href:
        `/docs/${targetDocument.slug}` +
        (fragment ? `#${fragment}` : ""),
      internal: true,
    };
  }

  const repositoryPath = repositoryRelativePath(targetPath);
  const kind = statSync(targetPath).isDirectory() ? "tree" : "blob";
  return {
    href:
      `${repository}/${kind}/v${encodeURIComponent(frameworkVersion)}/` +
      repositoryPath +
      (fragment ? `#${encodeURIComponent(fragment)}` : ""),
    internal: false,
  };
}

function rewriteAbsoluteDocsLink(document, href, documentsByPath) {
  const { fragment, pathname, query } = splitLocalReference(href);
  if (query) {
    fail(`${document.source} contains a docs link with a query string`);
  }
  if (pathname === "/docs") {
    if (fragment) {
      fail(`${document.source} links to an unknown /docs fragment`);
    }
    return { href: "/docs", internal: true };
  }

  const slug = pathname.slice("/docs/".length);
  const target = [...documentsByPath.values()].find(
    (candidate) => candidate.slug === slug,
  );
  if (!target) {
    fail(`${document.source} links to unknown documentation route ${pathname}`);
  }
  validateFragment(document, fragment, target);
  return {
    href: pathname + (fragment ? `#${fragment}` : ""),
    internal: true,
  };
}

function rewriteImage(document, href) {
  nonEmptyString(href, `${document.source} image href`);
  if (/^[A-Za-z][A-Za-z0-9+.-]*:/u.test(href)) {
    const url = safeUrl(href, `${document.source} image`);
    if (!["http:", "https:"].includes(url.protocol)) {
      fail(`${document.source} contains unsafe image protocol ${url.protocol}`);
    }
    return { href, internal: false };
  }
  if (href.startsWith("/") || href.startsWith("//")) {
    fail(`${document.source} contains unsupported image path ${href}`);
  }

  const { fragment, pathname, query } = splitLocalReference(href);
  if (fragment || query || !pathname) {
    fail(`${document.source} contains an invalid local image ${href}`);
  }
  const candidate = resolve(
    dirname(document.sourcePath),
    decodePath(pathname, `${document.source} image`),
  );
  if (!existsSync(candidate) || !statSync(candidate).isFile()) {
    fail(`${document.source} links to missing image ${pathname}`);
  }
  const targetPath = realpathSync(candidate);
  assertInside(packageRoot, targetPath, `${document.source} image ${href}`);
  return {
    href:
      `https://raw.githubusercontent.com/madojs/mado/` +
      `v${encodeURIComponent(frameworkVersion)}/` +
      repositoryRelativePath(targetPath),
    internal: false,
  };
}

function renderDocument(document) {
  const renderer = new marked.Renderer();

  renderer.heading = function (token) {
    const id = document.headingMap.get(token);
    if (!id) fail(`${document.source} has an untracked heading`);
    return (
      `<h${token.depth} id="${escapeAttribute(id)}">` +
      `${this.parser.parseInline(token.tokens)}</h${token.depth}>\n`
    );
  };

  renderer.html = (token) => {
    if (/^\s*<!--[\s\S]*-->\s*$/u.test(token.text)) return "";
    return escapeHtml(token.text);
  };

  renderer.link = function (token) {
    const reference = document.references.get(token);
    if (!reference) fail(`${document.source} has an untracked link`);
    const title = token.title
      ? ` title="${escapeAttribute(token.title)}"`
      : "";
    const internal = reference.internal
      ? ` data-doc-route="${escapeAttribute(reference.href)}"`
      : "";
    return (
      `<a href="${escapeAttribute(reference.href)}"${internal}${title}>` +
      `${this.parser.parseInline(token.tokens)}</a>`
    );
  };

  renderer.image = (token) => {
    const reference = document.references.get(token);
    if (!reference) fail(`${document.source} has an untracked image`);
    const title = token.title
      ? ` title="${escapeAttribute(token.title)}"`
      : "";
    return (
      `<img src="${escapeAttribute(reference.href)}" ` +
      `alt="${escapeAttribute(plainInline(token.tokens ?? []))}"${title}>`
    );
  };

  const html = marked.parser(document.tokens, {
    gfm: true,
    pedantic: false,
    renderer,
  });
  if (typeof html !== "string") {
    fail(`${document.source} rendered asynchronously`);
  }
  if (/<h1\b/iu.test(html)) {
    fail(`${document.source} body unexpectedly contains an H1`);
  }
  return html.trim();
}

function syncLlms(expected) {
  const trackedPath = join(root, "llms.txt");
  if (updateLlms) {
    writeFileAtomically(trackedPath, expected);
  } else if (
    !existsSync(trackedPath) ||
    !readFileSync(trackedPath).equals(expected)
  ) {
    fail(
      "tracked llms.txt differs from the installed framework; " +
        "run npm run docs:update and commit the result",
    );
  }

  const publicDirectory = join(root, "public");
  mkdirSync(publicDirectory, { recursive: true });
  writeFileAtomically(join(publicDirectory, "llms.txt"), expected);
}

function writeGeneratedOutput(documentList, manifestValue, llms) {
  const generatedParent = join(root, "src/generated");
  const target = join(generatedParent, "docs");
  const temporary = join(
    generatedParent,
    `.docs-${process.pid}-${Date.now()}`,
  );
  const pages = join(temporary, "pages");

  mkdirSync(pages, { recursive: true });
  try {
    const releaseManifest = generatedReleaseManifest(
      documentList,
      manifestValue,
      llms,
    );
    for (const document of documentList) {
      writeFileSync(
        join(pages, `${document.slug}.page.ts`),
        generatedPageModule(document),
        "utf8",
      );
    }
    writeFileSync(
      join(temporary, "routes.ts"),
      generatedRoutesModule(documentList),
      "utf8",
    );
    writeFileSync(
      join(temporary, "navigation.ts"),
      generatedNavigationModule(documentList, manifestValue),
      "utf8",
    );
    writeFileSync(
      join(temporary, "release-manifest.json"),
      `${JSON.stringify(releaseManifest, null, 2)}\n`,
      "utf8",
    );
    writeFileSync(
      join(temporary, "proof.ts"),
      generatedProofModule(releaseManifest.proof),
      "utf8",
    );
    swapDirectory(temporary, target);
  } catch (error) {
    rmSync(temporary, { recursive: true, force: true });
    throw error;
  }
}

function generatedPageModule(document) {
  const previous = document.previous
    ? {
        slug: document.previous.slug,
        title: document.previous.title(),
      }
    : null;
  const next = document.next
    ? { slug: document.next.slug, title: document.next.title() }
    : null;
  const value = {
    slug: document.slug,
    source: document.source,
    title: document.title,
    description: document.description,
    html: document.html,
    toc: document.toc,
    sectionId: document.sectionId,
    sectionTitle: document.sectionTitle,
    previous,
    next,
  };
  return (
    'import { defineDocumentPage } from "../../../docs/document-page";\n\n' +
    `export default defineDocumentPage(${JSON.stringify(value, null, 2)} ` +
    "as const);\n"
  );
}

function generatedRoutesModule(documentList) {
  const routes = documentList
    .map(
      (document) =>
        `  ${JSON.stringify(`/${document.slug}`)}: () => ` +
        `import("./pages/${document.slug}.page"),`,
    )
    .join("\n");
  return (
    `export const frameworkVersion = ${JSON.stringify(frameworkVersion)};\n\n` +
    "export const docsRoutes = {\n" +
    `${routes}\n` +
    "} as const;\n"
  );
}

function generatedNavigationModule(documentList, manifestValue) {
  const documentsBySlug = new Map(
    documentList.map((document) => [document.slug, document]),
  );
  const navigation = manifestValue.sections.map((section) => ({
    id: section.id,
    title: section.title,
    entries: section.entries.map((entry) => {
      const document = documentsBySlug.get(entry.slug);
      return {
        slug: document.slug,
        title: document.title,
        description: document.description,
        source: document.source,
      };
    }),
  }));
  const flat = documentList.map((document) => ({
    slug: document.slug,
    title: document.title,
    description: document.description,
    source: document.source,
    sectionId: document.sectionId,
    sectionTitle: document.sectionTitle,
  }));
  return (
    `export const frameworkVersion = ${JSON.stringify(frameworkVersion)};\n\n` +
    `export const docsNavigation = ${JSON.stringify(navigation, null, 2)} ` +
    "as const;\n\n" +
    `export const docsDocuments = ${JSON.stringify(flat, null, 2)} ` +
    "as const;\n"
  );
}

function generatedProofModule(proof) {
  return (
    "export const proofContractSchemaVersion = " +
    `${JSON.stringify(proof.schemaVersion)} as const;\n\n` +
    `export const proofRows = ${JSON.stringify(
      proofDisplayRows(proof),
      null,
      2,
    )} as const;\n`
  );
}

function generatedReleaseManifest(documentList, manifestValue, llms) {
  const value = {
    schemaVersion: RELEASE_MANIFEST_SCHEMA_VERSION,
    frameworkVersion,
    framework: {
      package: packageName,
      version: frameworkVersion,
      tag: `v${frameworkVersion}`,
      repository,
      metadata: `${packageName}/package.json`,
    },
    locale: manifestValue.locale,
    home: {
      path: "/docs",
      title: "Documentation that matches the package.",
      description:
        "Read the complete Mado framework documentation, generated from the " +
        "exact package used to build this site.",
      source: "site:src/docs/docs-home.page.ts",
      headings: manifestValue.sections.map((section) => ({
        id: `docs-section-${section.id}`,
        title: section.title,
        depth: 2,
      })),
    },
    routes: documentList.map((document) => ({
      slug: document.slug,
      source: document.source,
      path: `/docs/${document.slug}`,
      title: document.title,
      description: document.description,
      sectionId: document.sectionId,
      sectionTitle: document.sectionTitle,
      headings: document.headings,
    })),
    llms: {
      source: `${packageName}/llms.txt`,
      publicPath: "/llms.txt",
      sha256: createHash("sha256").update(llms).digest("hex"),
    },
  };
  value.proof = createProofContract({
    authoredRoutePaths: Object.keys(authoredRoutes),
    documentationRoutePaths: [
      value.home.path,
      ...value.routes.map((route) => route.path),
    ],
    framework: value.framework,
    root,
  });
  return value;
}

function swapDirectory(temporary, target) {
  const backup = `${target}.previous-${process.pid}`;
  rmSync(backup, { recursive: true, force: true });
  if (existsSync(target)) renameSync(target, backup);
  try {
    renameSync(temporary, target);
    rmSync(backup, { recursive: true, force: true });
  } catch (error) {
    if (existsSync(backup) && !existsSync(target)) {
      renameSync(backup, target);
    }
    throw error;
  }
}

function writeFileAtomically(path, contents) {
  if (existsSync(path) && readFileSync(path).equals(contents)) return;
  const temporary = `${path}.tmp-${process.pid}`;
  writeFileSync(temporary, contents);
  try {
    renameSync(temporary, path);
  } catch (error) {
    const replaceErrors = new Set(["EACCES", "EEXIST", "EPERM"]);
    if (
      !existsSync(path) ||
      !replaceErrors.has(error?.code)
    ) {
      rmSync(temporary, { force: true });
      throw error;
    }

    const backup = `${path}.previous-${process.pid}`;
    rmSync(backup, { force: true });
    try {
      renameSync(path, backup);
      renameSync(temporary, path);
      rmSync(backup, { force: true });
    } catch (replacementError) {
      let restoreError;
      if (!existsSync(path) && existsSync(backup)) {
        try {
          renameSync(backup, path);
        } catch (error_) {
          restoreError = error_;
        }
      }
      rmSync(temporary, { force: true });
      if (restoreError) {
        throw new AggregateError(
          [replacementError, restoreError],
          `could not replace or restore ${path}`,
        );
      }
      throw replacementError;
    }
  }
}

function validateFragment(sourceDocument, fragment, targetDocument) {
  if (!fragment) return;
  if (!targetDocument.headingIds.has(fragment)) {
    fail(
      `${sourceDocument.source} links to missing fragment ` +
        `#${fragment} in ${targetDocument.source}`,
    );
  }
}

function splitLocalReference(value) {
  const hashIndex = value.indexOf("#");
  const beforeHash = hashIndex === -1 ? value : value.slice(0, hashIndex);
  const encodedFragment = hashIndex === -1 ? "" : value.slice(hashIndex + 1);
  const queryIndex = beforeHash.indexOf("?");
  const pathname = queryIndex === -1
    ? beforeHash
    : beforeHash.slice(0, queryIndex);
  const query = queryIndex === -1 ? "" : beforeHash.slice(queryIndex + 1);
  let fragment = "";
  try {
    fragment = decodeURIComponent(encodedFragment);
  } catch {
    fail(`link contains an invalid encoded fragment: ${value}`);
  }
  if (fragment && !/^[a-z0-9][a-z0-9._:-]*$/u.test(fragment)) {
    fail(`link contains an unsafe fragment: ${value}`);
  }
  return { fragment, pathname, query };
}

function decodePath(value, context) {
  let decoded;
  try {
    decoded = decodeURIComponent(value);
  } catch {
    fail(`${context} contains invalid percent encoding`);
  }
  if (decoded.includes("\0")) fail(`${context} contains a null byte`);
  return decoded;
}

function repositoryRelativePath(path) {
  const value = relative(packageRoot, path);
  if (!value || value.startsWith(`..${sep}`) || isAbsolute(value)) {
    fail(`could not create a repository path for ${path}`);
  }
  return value.split(sep).map(encodeURIComponent).join("/");
}

function assertInside(parent, child, context) {
  const value = relative(parent, child);
  if (value === ".." || value.startsWith(`..${sep}`) || isAbsolute(value)) {
    fail(`${context} escapes the installed ${packageName} package`);
  }
}

function headingSlug(value) {
  const slug = value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9 _-]/gu, "")
    .trim()
    .replace(/\s+/gu, "-")
    .replace(/-+/gu, "-");
  if (!slug) fail(`could not derive a safe heading id from ${JSON.stringify(value)}`);
  return slug;
}

function plainInline(tokens) {
  return normalizeWhitespace(tokens.map(plainToken).join(""));
}

function plainToken(token) {
  if (token.type === "br") return " ";
  if (token.type === "codespan") return token.text;
  if (token.type === "image") return token.text ?? "";
  if (token.type === "html") return "";
  if (Array.isArray(token.tokens)) {
    return token.tokens.map(plainToken).join("");
  }
  if (typeof token.text === "string") return token.text;
  return "";
}

function summarize(value) {
  const normalized = normalizeWhitespace(value);
  if (normalized.length <= 200) return normalized;
  const prefix = normalized.slice(0, 199);
  const breakAt = prefix.lastIndexOf(" ");
  return `${prefix.slice(0, breakAt > 140 ? breakAt : 199).trimEnd()}…`;
}

function normalizeWhitespace(value) {
  return decodeEntities(value).replace(/\s+/gu, " ").trim();
}

function decodeEntities(value) {
  return value.replace(
    /&(?:#(\d+)|#x([0-9a-f]+)|([a-z]+));/giu,
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

function safeUrl(value, context) {
  try {
    return new URL(value);
  } catch {
    fail(`${context} is not a valid URL: ${value}`);
  }
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function escapeAttribute(value) {
  return escapeHtml(String(value));
}

function exactKeys(value, expected, context) {
  const actual = Object.keys(value).sort();
  const sortedExpected = [...expected].sort();
  if (JSON.stringify(actual) !== JSON.stringify(sortedExpected)) {
    fail(
      `${context} keys are ${actual.join(", ") || "(none)"}, expected ` +
        sortedExpected.join(", "),
    );
  }
}

function nonEmptyString(value, context) {
  if (typeof value !== "string" || value.trim() === "") {
    fail(`${context} must be a non-empty string`);
  }
}

function isPlainObject(value) {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype
  );
}

function fail(message) {
  throw new Error(`[site docs] ${message}`);
}
