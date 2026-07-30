import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";

import {
  createProofContract,
  proofDisplayRows,
} from "../scripts/proof-contract.mjs";

const framework = {
  package: "@madojs/mado",
  version: "1.2.3",
  tag: "v1.2.3",
  repository: "https://github.com/madojs/mado",
  metadata: "@madojs/mado/package.json",
};

test("derives proof from legacy v1 UI locks without inventing ownership", () => {
  const content = "@layer mado-ui { :root {} }\n";
  withFixture({
    files: {
      "src/styles/mado-ui-theme.css": content,
    },
    lock: {
      version: 1,
      items: {
        theme: {
          registryVersion: "0.1.2",
          files: {
            "src/styles/mado-ui-theme.css": {
              source: "foundation/mado-ui-theme.css",
              hash: sha256(content),
            },
          },
        },
      },
    },
  }, (root) => {
    const proof = contract(root);
    assert.equal(proof.ui.lockVersion, 1);
    assert.equal(proof.ui.registryCompatibility, 1);
    assert.equal(proof.ui.explicitRecipes, null);
    assert.equal(proof.ui.recipes[0].dependencies, null);
    assert.equal(proof.ui.customizedFileCount, 0);
    assert.deepEqual(
      proofDisplayRows(proof).map((row) => [row.id, row.value, row.status]),
      [
        ["routes-authored", "2 routes", "SOURCE"],
        ["routes-documentation", "2 routes", "GENERATED"],
        ["routes-public", "4 routes", "CONTRACT"],
        ["framework-package", "@madojs/mado@1.2.3", "EXACT"],
        ["ui-recipes", "1 recipe / 1 file", "LOCKED"],
        ["ui-registry", "v0.1.2", "UNCHANGED"],
      ],
    );
  });
});

test("derives explicit ownership and dependency edges from UI lock v2", () => {
  const theme = "@layer mado-ui { :root {} }\n";
  const localButton = ".mado-ui-button { color: CanvasText; }\n";
  withFixture({
    files: {
      "src/styles/mado-ui-theme.css": theme,
      "src/styles/mado-ui-button.css": localButton,
    },
    lock: {
      version: 2,
      registryCompatibility: 2,
      explicitItems: ["button"],
      items: {
        button: {
          registryVersion: "0.2.0",
          dependencies: ["theme"],
          files: {
            "src/styles/mado-ui-button.css": {
              source: "primitives/button/mado-ui-button.css",
              hash: sha256(".mado-ui-button {}\n"),
            },
          },
        },
        theme: {
          registryVersion: "0.2.0",
          dependencies: [],
          files: {
            "src/styles/mado-ui-theme.css": {
              source: "foundation/mado-ui-theme.css",
              hash: sha256(theme),
            },
          },
        },
      },
    },
  }, (root) => {
    const proof = contract(root);
    assert.equal(proof.ui.lockVersion, 2);
    assert.equal(proof.ui.registryCompatibility, 2);
    assert.deepEqual(proof.ui.explicitRecipes, ["button"]);
    assert.deepEqual(
      proof.ui.recipes.map((recipe) => [
        recipe.name,
        recipe.dependencies,
      ]),
      [
        ["button", ["theme"]],
        ["theme", []],
      ],
    );
    assert.equal(proof.ui.customizedFileCount, 1);
    assert.deepEqual(
      proofDisplayRows(proof).at(-1),
      {
        id: "ui-registry",
        label: "ui:registry",
        value: "v0.2.0",
        status: "1 LOCAL",
      },
    );
  });
});

test("rejects incomplete UI lock v2 instead of reading it as v1", () => {
  const content = ".mado-ui-button {}\n";
  withFixture({
    files: {
      "src/styles/mado-ui-button.css": content,
    },
    lock: {
      version: 2,
      registryCompatibility: 1,
      explicitItems: ["button"],
      items: {
        button: {
          registryVersion: "0.2.0",
          files: {
            "src/styles/mado-ui-button.css": {
              source: "primitives/button/mado-ui-button.css",
              hash: sha256(content),
            },
          },
        },
      },
    },
  }, (root) => {
    assert.throws(
      () => contract(root),
      /UI recipe button keys .*dependencies/u,
    );
  });
});

function contract(root) {
  return createProofContract({
    authoredRoutePaths: ["/", "/proof"],
    documentationRoutePaths: ["/docs", "/docs/quickstart"],
    framework,
    root,
  });
}

function withFixture({ files, lock }, callback) {
  const root = mkdtempSync(join(tmpdir(), "mado-site-proof-"));
  try {
    writeFileSync(
      join(root, "mado-ui.json"),
      `${JSON.stringify({ version: 1 })}\n`,
      "utf8",
    );
    writeFileSync(
      join(root, ".mado-ui.lock.json"),
      `${JSON.stringify(lock, null, 2)}\n`,
      "utf8",
    );
    for (const [path, content] of Object.entries(files)) {
      const target = join(root, path);
      mkdirSync(dirname(target), { recursive: true });
      writeFileSync(target, content, "utf8");
    }
    callback(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}
