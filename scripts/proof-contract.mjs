import { createHash } from "node:crypto";
import { existsSync, readFileSync, statSync } from "node:fs";
import { isAbsolute, relative, resolve, sep } from "node:path";

export const RELEASE_MANIFEST_SCHEMA_VERSION = 2;
export const PROOF_CONTRACT_SCHEMA_VERSION = 1;

const frameworkPackage = "@madojs/mado";
const frameworkMetadata = `${frameworkPackage}/package.json`;
const uiConfigFile = "mado-ui.json";
const uiLockFile = ".mado-ui.lock.json";

export function createProofContract({
  authoredRoutePaths,
  documentationRoutePaths,
  framework,
  root,
}) {
  const authored = routePaths(
    authoredRoutePaths,
    /^\/(?:|[a-z0-9]+(?:[.-][a-z0-9]+)*)$/u,
    "authored",
  );
  const documentation = routePaths(
    documentationRoutePaths,
    /^\/docs(?:\/[a-z0-9]+(?:[.-][a-z0-9]+)*)*$/u,
    "documentation",
  );
  if (!documentation.includes("/docs")) {
    fail("documentation routes do not include /docs");
  }

  const overlap = authored.find((path) => documentation.includes(path));
  if (overlap) {
    fail(`route ${overlap} is both authored and documentation-owned`);
  }

  return {
    schemaVersion: PROOF_CONTRACT_SCHEMA_VERSION,
    routes: {
      authored,
      documentation,
    },
    framework: frameworkProvenance(framework),
    ui: uiProvenance(root),
  };
}

export function proofDisplayRows(contract) {
  validateProofContract(contract);
  const authoredCount = contract.routes.authored.length;
  const documentationCount = contract.routes.documentation.length;
  const publicCount = authoredCount + documentationCount;
  const registryVersions = contract.ui.registryVersions
    .map((version) => `v${version}`)
    .join(" + ");

  return [
    {
      id: "routes-authored",
      label: "routes:authored",
      value: countLabel(authoredCount, "route"),
      status: "SOURCE",
    },
    {
      id: "routes-documentation",
      label: "routes:docs",
      value: countLabel(documentationCount, "route"),
      status: "GENERATED",
    },
    {
      id: "routes-public",
      label: "release:public",
      value: countLabel(publicCount, "route"),
      status: "CONTRACT",
    },
    {
      id: "framework-package",
      label: "mado:package",
      value: `${contract.framework.package}@${contract.framework.version}`,
      status: "EXACT",
    },
    {
      id: "ui-recipes",
      label: "ui:recipes",
      value:
        `${countLabel(contract.ui.recipeCount, "recipe")} / ` +
        countLabel(contract.ui.fileCount, "file"),
      status: "LOCKED",
    },
    {
      id: "ui-registry",
      label: "ui:registry",
      value: registryVersions,
      status:
        contract.ui.customizedFileCount === 0
          ? "UNCHANGED"
          : `${contract.ui.customizedFileCount} LOCAL`,
    },
  ];
}

function countLabel(count, singular) {
  return `${count} ${count === 1 ? singular : `${singular}s`}`;
}

export function validateProofContract(contract) {
  if (!isPlainObject(contract)) fail("proof contract must be an object");
  exactKeys(
    contract,
    ["schemaVersion", "routes", "framework", "ui"],
    "proof contract",
  );
  if (contract.schemaVersion !== PROOF_CONTRACT_SCHEMA_VERSION) {
    fail(
      `unsupported proof contract schema ${String(contract.schemaVersion)}`,
    );
  }
  if (!isPlainObject(contract.routes)) {
    fail("proof routes must be an object");
  }
  exactKeys(
    contract.routes,
    ["authored", "documentation"],
    "proof routes",
  );
  routePaths(
    contract.routes.authored,
    /^\/(?:|[a-z0-9]+(?:[.-][a-z0-9]+)*)$/u,
    "authored",
  );
  routePaths(
    contract.routes.documentation,
    /^\/docs(?:\/[a-z0-9]+(?:[.-][a-z0-9]+)*)*$/u,
    "documentation",
  );
  frameworkProvenance(contract.framework);
  validateUiProvenance(contract.ui);
  return contract;
}

function frameworkProvenance(value) {
  if (!isPlainObject(value)) {
    fail("framework provenance must be an object");
  }
  exactKeys(
    value,
    ["package", "version", "tag", "repository", "metadata"],
    "framework provenance",
  );
  if (value.package !== frameworkPackage) {
    fail(`framework provenance must name ${frameworkPackage}`);
  }
  if (!validVersion(value.version)) {
    fail("framework provenance has an invalid version");
  }
  if (value.tag !== `v${value.version}`) {
    fail("framework provenance tag does not match its version");
  }
  if (value.repository !== "https://github.com/madojs/mado") {
    fail("framework provenance has an unexpected repository");
  }
  if (value.metadata !== frameworkMetadata) {
    fail(`framework metadata must be ${frameworkMetadata}`);
  }
  return {
    package: value.package,
    version: value.version,
    tag: value.tag,
    repository: value.repository,
    metadata: value.metadata,
  };
}

function uiProvenance(root) {
  const projectRoot = resolve(root);
  const config = readJson(resolve(projectRoot, uiConfigFile), uiConfigFile);
  const lock = readJson(resolve(projectRoot, uiLockFile), uiLockFile);
  if (config.version !== 1) {
    fail(`${uiConfigFile} has unsupported version ${String(config.version)}`);
  }
  const parsedLock = parseUiLock(lock);

  const targets = new Set();
  const recipes = Object.entries(parsedLock.items)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([name, item]) => {
      const files = Object.entries(item.files)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([target, file]) => {
          if (targets.has(target)) {
            fail(`UI target ${target} is owned by more than one recipe`);
          }
          targets.add(target);
          if (!safeRelativePath(target)) {
            fail(`UI recipe ${name} has unsafe target ${JSON.stringify(target)}`);
          }
          if (!isPlainObject(file)) {
            fail(`UI recipe ${name} target ${target} must be an object`);
          }
          exactKeys(file, ["source", "hash"], `UI recipe ${name} target ${target}`);
          if (!safeRelativePath(file.source)) {
            fail(`UI recipe ${name} has unsafe source ${JSON.stringify(file.source)}`);
          }
          if (!/^[a-f0-9]{64}$/u.test(file.hash)) {
            fail(`UI recipe ${name} target ${target} has an invalid hash`);
          }

          const targetPath = resolve(projectRoot, target);
          assertInside(projectRoot, targetPath, `UI target ${target}`);
          if (!existsSync(targetPath) || !statSync(targetPath).isFile()) {
            fail(`UI target ${target} does not exist`);
          }
          const currentHash = createHash("sha256")
            .update(readFileSync(targetPath))
            .digest("hex");
          return {
            target,
            source: file.source,
            registrySha256: file.hash,
            currentSha256: currentHash,
            customized: currentHash !== file.hash,
          };
        });
      return {
        name,
        registryVersion: item.registryVersion,
        dependencies: item.dependencies,
        files,
      };
    });

  const files = recipes.flatMap((recipe) => recipe.files);
  const registryVersions = [
    ...new Set(recipes.map((recipe) => recipe.registryVersion)),
  ].sort((left, right) => left.localeCompare(right));
  const value = {
    config: uiConfigFile,
    lockfile: uiLockFile,
    configVersion: config.version,
    lockVersion: parsedLock.version,
    registryCompatibility: parsedLock.registryCompatibility,
    explicitRecipes: parsedLock.explicitItems,
    registryVersions,
    recipeCount: recipes.length,
    fileCount: files.length,
    customizedFileCount: files.filter((file) => file.customized).length,
    recipes,
  };
  validateUiProvenance(value);
  return value;
}

function parseUiLock(lock) {
  if (!isPlainObject(lock)) fail(`${uiLockFile} must be an object`);
  if (lock.version === 1) return parseUiLockV1(lock);
  if (lock.version === 2) return parseUiLockV2(lock);
  fail(`${uiLockFile} has unsupported version ${String(lock.version)}`);
}

function parseUiLockV1(lock) {
  allowedKeys(
    lock,
    ["version", "registryCompatibility", "items"],
    ["version", "items"],
    `${uiLockFile} v1`,
  );
  const registryCompatibility = lock.registryCompatibility ?? 1;
  validateRegistryCompatibility(registryCompatibility);
  const items = parseUiItems(lock.items, 1);
  return {
    version: 1,
    registryCompatibility,
    explicitItems: null,
    items,
  };
}

function parseUiLockV2(lock) {
  exactKeys(
    lock,
    ["version", "registryCompatibility", "explicitItems", "items"],
    `${uiLockFile} v2`,
  );
  validateRegistryCompatibility(lock.registryCompatibility);
  const items = parseUiItems(lock.items, 2);
  const explicitItems = itemNames(
    lock.explicitItems,
    `${uiLockFile} explicitItems`,
  ).sort((left, right) => left.localeCompare(right));
  for (const name of explicitItems) {
    if (!Object.hasOwn(items, name)) {
      fail(`${uiLockFile} explicit item ${name} is not installed`);
    }
  }
  for (const [name, item] of Object.entries(items)) {
    for (const dependency of item.dependencies) {
      if (!Object.hasOwn(items, dependency)) {
        fail(
          `${uiLockFile} recipe ${name} depends on missing recipe ${dependency}`,
        );
      }
    }
  }
  return {
    version: 2,
    registryCompatibility: lock.registryCompatibility,
    explicitItems,
    items,
  };
}

function parseUiItems(value, version) {
  if (!isPlainObject(value) || Object.keys(value).length === 0) {
    fail(`${uiLockFile} contains no installed recipes`);
  }
  return Object.fromEntries(
    Object.entries(value).map(([name, item]) => {
      if (!validItemName(name)) {
        fail(`${uiLockFile} has invalid recipe name ${JSON.stringify(name)}`);
      }
      if (!isPlainObject(item)) {
        fail(`${uiLockFile} recipe ${name} must be an object`);
      }
      const expected =
        version === 1
          ? ["registryVersion", "files"]
          : ["registryVersion", "dependencies", "files"];
      exactKeys(item, expected, `UI recipe ${name}`);
      if (!nonEmptyString(item.registryVersion)) {
        fail(`UI recipe ${name} has an invalid registryVersion`);
      }
      const dependencies =
        version === 1
          ? null
          : itemNames(
              item.dependencies,
              `${uiLockFile} recipe ${name} dependencies`,
            ).sort((left, right) => left.localeCompare(right));
      if (dependencies?.includes(name)) {
        fail(`${uiLockFile} recipe ${name} cannot depend on itself`);
      }
      if (!isPlainObject(item.files) || Object.keys(item.files).length === 0) {
        fail(`UI recipe ${name} contains no files`);
      }
      return [
        name,
        {
          registryVersion: item.registryVersion,
          dependencies,
          files: item.files,
        },
      ];
    }),
  );
}

function validateRegistryCompatibility(value) {
  if (!Number.isSafeInteger(value) || value < 1) {
    fail(`${uiLockFile} has an invalid registryCompatibility`);
  }
}

function itemNames(value, context) {
  if (!Array.isArray(value)) fail(`${context} must be an array`);
  const result = [];
  const seen = new Set();
  for (const name of value) {
    if (!validItemName(name)) {
      fail(`${context} contains invalid recipe name ${JSON.stringify(name)}`);
    }
    if (seen.has(name)) fail(`${context} contains duplicate recipe ${name}`);
    seen.add(name);
    result.push(name);
  }
  return result;
}

function validItemName(value) {
  return (
    typeof value === "string" &&
    /^[a-z][a-z0-9-]*$/u.test(value)
  );
}

function validateUiProvenance(value) {
  if (!isPlainObject(value)) fail("UI provenance must be an object");
  exactKeys(
    value,
    [
      "config",
      "lockfile",
      "configVersion",
      "lockVersion",
      "registryCompatibility",
      "explicitRecipes",
      "registryVersions",
      "recipeCount",
      "fileCount",
      "customizedFileCount",
      "recipes",
    ],
    "UI provenance",
  );
  if (value.config !== uiConfigFile || value.lockfile !== uiLockFile) {
    fail("UI provenance points at unexpected project files");
  }
  if (value.configVersion !== 1) {
    fail("UI provenance has an unsupported config version");
  }
  if (![1, 2].includes(value.lockVersion)) {
    fail("UI provenance has an unsupported lock version");
  }
  if (
    !Number.isSafeInteger(value.registryCompatibility) ||
    value.registryCompatibility < 1
  ) {
    fail("UI provenance has an invalid registry compatibility");
  }
  for (const [key, number] of [
    ["recipeCount", value.recipeCount],
    ["fileCount", value.fileCount],
    ["customizedFileCount", value.customizedFileCount],
  ]) {
    if (!Number.isSafeInteger(number) || number < 0) {
      fail(`UI provenance ${key} must be a non-negative integer`);
    }
  }
  if (
    value.lockVersion === 1
      ? value.explicitRecipes !== null
      : !Array.isArray(value.explicitRecipes)
  ) {
    fail("UI provenance explicit recipes do not match its lock version");
  }
  if (
    !Array.isArray(value.registryVersions) ||
    value.registryVersions.length === 0 ||
    value.registryVersions.some((version) => !nonEmptyString(version))
  ) {
    fail("UI provenance has invalid registry versions");
  }
  if (
    !Array.isArray(value.recipes) ||
    value.recipes.length !== value.recipeCount
  ) {
    fail("UI provenance recipe count does not match its recipes");
  }
  const recipeNames = new Set();
  const targetNames = new Set();
  const files = value.recipes.flatMap((recipe) => {
    if (!isPlainObject(recipe)) {
      fail("UI provenance contains an invalid recipe");
    }
    exactKeys(
      recipe,
      ["name", "registryVersion", "dependencies", "files"],
      "UI provenance recipe",
    );
    if (
      !validItemName(recipe.name) ||
      !nonEmptyString(recipe.registryVersion) ||
      (value.lockVersion === 1
        ? recipe.dependencies !== null
        : !Array.isArray(recipe.dependencies)) ||
      !Array.isArray(recipe.files)
    ) {
      fail("UI provenance contains an invalid recipe");
    }
    if (recipeNames.has(recipe.name)) {
      fail(`UI provenance contains duplicate recipe ${recipe.name}`);
    }
    recipeNames.add(recipe.name);
    if (Array.isArray(recipe.dependencies)) {
      itemNames(
        recipe.dependencies,
        `UI provenance recipe ${recipe.name} dependencies`,
      );
    }
    for (const file of recipe.files) {
      if (!isPlainObject(file)) {
        fail(`UI provenance recipe ${recipe.name} contains an invalid file`);
      }
      exactKeys(
        file,
        [
          "target",
          "source",
          "registrySha256",
          "currentSha256",
          "customized",
        ],
        `UI provenance recipe ${recipe.name} file`,
      );
      if (
        !safeRelativePath(file.target) ||
        !safeRelativePath(file.source) ||
        !/^[a-f0-9]{64}$/u.test(file.registrySha256) ||
        !/^[a-f0-9]{64}$/u.test(file.currentSha256) ||
        typeof file.customized !== "boolean" ||
        file.customized !==
          (file.registrySha256 !== file.currentSha256)
      ) {
        fail(`UI provenance recipe ${recipe.name} contains an invalid file`);
      }
      if (targetNames.has(file.target)) {
        fail(`UI provenance contains duplicate target ${file.target}`);
      }
      targetNames.add(file.target);
    }
    return recipe.files;
  });
  if (value.lockVersion === 2) {
    const explicit = itemNames(
      value.explicitRecipes,
      "UI provenance explicit recipes",
    );
    for (const name of explicit) {
      if (!recipeNames.has(name)) {
        fail(`UI provenance explicit recipe ${name} is not installed`);
      }
    }
    for (const recipe of value.recipes) {
      for (const dependency of recipe.dependencies) {
        if (!recipeNames.has(dependency)) {
          fail(
            `UI provenance recipe ${recipe.name} depends on missing ` +
              `recipe ${dependency}`,
          );
        }
      }
    }
  }
  const expectedRegistryVersions = [
    ...new Set(value.recipes.map((recipe) => recipe.registryVersion)),
  ].sort((left, right) => left.localeCompare(right));
  if (
    JSON.stringify(value.registryVersions) !==
    JSON.stringify(expectedRegistryVersions)
  ) {
    fail("UI provenance registry versions do not match its recipes");
  }
  if (files.length !== value.fileCount) {
    fail("UI provenance file count does not match its recipes");
  }
  const customized = files.filter((file) => file.customized).length;
  if (customized !== value.customizedFileCount) {
    fail("UI provenance customized count does not match its recipes");
  }
  return value;
}

function routePaths(values, pattern, label) {
  if (!Array.isArray(values) || values.length === 0) {
    fail(`${label} routes must be a non-empty array`);
  }
  const result = [];
  const seen = new Set();
  for (const value of values) {
    if (typeof value !== "string" || !pattern.test(value)) {
      fail(`${label} route ${JSON.stringify(value)} is invalid`);
    }
    if (seen.has(value)) fail(`${label} route ${value} is duplicated`);
    seen.add(value);
    result.push(value);
  }
  return result;
}

function readJson(path, label) {
  let value;
  try {
    value = JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    fail(`${label} is not valid JSON: ${error.message}`);
  }
  return value;
}

function assertInside(parent, child, context) {
  const value = relative(parent, child);
  if (value === ".." || value.startsWith(`..${sep}`) || isAbsolute(value)) {
    fail(`${context} escapes the project root`);
  }
}

function safeRelativePath(value) {
  return (
    typeof value === "string" &&
    value !== "" &&
    !isAbsolute(value) &&
    !/^[A-Za-z]:\//u.test(value) &&
    !value.includes("\\") &&
    !value.split(/[\\/]/u).includes("..") &&
    !value.includes("\0")
  );
}

function validVersion(value) {
  return (
    typeof value === "string" &&
    /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/u.test(value)
  );
}

function nonEmptyString(value) {
  return typeof value === "string" && value.length > 0;
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

function allowedKeys(value, allowed, required, context) {
  const allowedSet = new Set(allowed);
  const unknown = Object.keys(value).filter((key) => !allowedSet.has(key));
  const missing = required.filter((key) => !Object.hasOwn(value, key));
  if (unknown.length > 0 || missing.length > 0) {
    fail(
      `${context} has ` +
        `${unknown.length > 0 ? `unknown keys ${unknown.join(", ")}` : ""}` +
        `${unknown.length > 0 && missing.length > 0 ? " and " : ""}` +
        `${missing.length > 0 ? `missing keys ${missing.join(", ")}` : ""}`,
    );
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
  throw new Error(`[site proof] ${message}`);
}
