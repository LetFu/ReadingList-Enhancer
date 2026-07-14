const assert = require("node:assert/strict");

const {
  buildExportPayload,
  buildImportPlan,
  buildUrlListExport,
  getCurrentPageActions,
  normalizeImportPayload,
  normalizeTags
} = require("../sidepanel/data.js");

function testNormalizeTags() {
  assert.deepEqual(
    normalizeTags(" AI, later, ai, , Later "),
    ["ai", "later"]
  );

  assert.deepEqual(
    normalizeTags(["Beta", " alpha ", "", "beta"]),
    ["alpha", "beta"]
  );
}

function testBuildExportPayload() {
  const payload = buildExportPayload(
    [
      {
        url: "https://example.com/a",
        title: "A",
        hasBeenRead: false
      }
    ],
    {
      "https://example.com/a": ["later"],
      "https://example.com/orphan": ["skip"]
    },
    "2026-07-09T00:00:00.000Z"
  );

  assert.deepEqual(payload, {
    schemaVersion: 1,
    source: "ReadingList Enhancer",
    exportedAt: "2026-07-09T00:00:00.000Z",
    entries: [
      {
        url: "https://example.com/a",
        title: "A",
        hasBeenRead: false,
        tags: ["later"]
      }
    ]
  });
}

function testBuildUrlListExport() {
  assert.equal(
    buildUrlListExport([
      { url: "https://example.com/a", title: "A" },
      { url: "https://example.com/b", title: "B" }
    ]),
    "https://example.com/a\nhttps://example.com/b"
  );
}

function testNormalizeImportPayload() {
  assert.throws(
    () => normalizeImportPayload("{"),
    /Invalid import JSON/
  );

  assert.throws(
    () => normalizeImportPayload(JSON.stringify({ schemaVersion: 2, entries: [] })),
    /Unsupported import schema/
  );

  const payload = normalizeImportPayload(JSON.stringify({
    schemaVersion: 1,
    entries: [
      {
        url: "chrome://settings",
        title: "Skip",
        hasBeenRead: true,
        tags: ["skip"]
      },
      {
        url: "https://example.com/new",
        title: " New ",
        hasBeenRead: true,
        tags: "AI, ai, Later"
      }
    ]
  }));

  assert.deepEqual(payload.entries, [
    {
      url: "https://example.com/new",
      title: "New",
      hasBeenRead: true,
      tags: ["ai", "later"]
    }
  ]);
}

function testBuildImportPlan() {
  const imported = {
    entries: [
      {
        url: "https://example.com/existing",
        title: "Imported title",
        hasBeenRead: false,
        tags: ["ai", "later"]
      },
      {
        url: "https://example.com/new",
        title: "New title",
        hasBeenRead: true,
        tags: ["read"]
      }
    ]
  };

  const plan = buildImportPlan(
    imported,
    [
      {
        url: "https://example.com/existing",
        title: "Keep title",
        hasBeenRead: true
      }
    ],
    {
      "https://example.com/existing": ["saved"],
      "not-a-url": ["skip"]
    }
  );

  assert.deepEqual(plan.entriesToAdd, [
    {
      url: "https://example.com/new",
      title: "New title",
      hasBeenRead: true
    }
  ]);

  assert.deepEqual(plan.tagsByUrl, {
    "https://example.com/existing": ["ai", "later", "saved"],
    "https://example.com/new": ["read"]
  });
}

function testGetCurrentPageActions() {
  assert.deepEqual(getCurrentPageActions(null, false), {
    add: { disabled: true, label: "Current page unavailable", visible: true },
    saved: { visible: false }
  });

  assert.deepEqual(getCurrentPageActions(null, true), {
    add: { disabled: false, label: "Add current page", visible: true },
    saved: { visible: false }
  });

  assert.deepEqual(getCurrentPageActions({ hasBeenRead: false }, true), {
    add: { visible: false },
    saved: { markLabel: "Mark read", visible: true }
  });

  assert.deepEqual(getCurrentPageActions({ hasBeenRead: true }, true), {
    add: { visible: false },
    saved: { markLabel: "Mark unread", visible: true }
  });
}

testNormalizeTags();
testBuildExportPayload();
testBuildUrlListExport();
testNormalizeImportPayload();
testBuildImportPlan();
testGetCurrentPageActions();

console.log("data tests passed");
