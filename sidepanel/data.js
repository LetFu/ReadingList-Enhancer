(function initReadingListData(root) {
  const SCHEMA_VERSION = 1;
  const SOURCE = "ReadingList Enhancer";
  const ALLOWED_PROTOCOLS = new Set(["http:", "https:"]);

  function normalizeTags(value) {
    const rawTags = Array.isArray(value)
      ? value
      : String(value || "").split(",");

    return Array.from(new Set(
      rawTags
        .map((tag) => String(tag).trim().toLowerCase())
        .filter(Boolean)
    )).sort((left, right) => left.localeCompare(right));
  }

  function normalizeTagsByUrl(value) {
    const tagsByUrl = {};
    if (!value || typeof value !== "object") return tagsByUrl;

    for (const [url, tags] of Object.entries(value)) {
      if (!isReadableUrl(url)) continue;

      const normalized = normalizeTags(tags);
      if (normalized.length > 0) {
        tagsByUrl[url] = normalized;
      }
    }

    return tagsByUrl;
  }

  function buildExportPayload(entries, tagsByUrl, exportedAt = new Date().toISOString()) {
    return {
      schemaVersion: SCHEMA_VERSION,
      source: SOURCE,
      exportedAt,
      entries: entries.map((entry) => ({
        url: entry.url,
        title: entry.title || entry.url,
        hasBeenRead: Boolean(entry.hasBeenRead),
        tags: normalizeTags(tagsByUrl?.[entry.url])
      }))
    };
  }

  function buildUrlListExport(entries) {
    return entries.map((entry) => entry.url).join("\n");
  }

  function getCurrentPageActions(entry, isUsable) {
    if (!isUsable) {
      return {
        add: { disabled: true, label: "Current page unavailable", visible: true },
        saved: { visible: false }
      };
    }

    if (!entry) {
      return {
        add: { disabled: false, label: "Add current page", visible: true },
        saved: { visible: false }
      };
    }

    return {
      add: { visible: false },
      saved: {
        markLabel: entry.hasBeenRead ? "Mark unread" : "Mark read",
        visible: true
      }
    };
  }

  function normalizeImportPayload(text) {
    let payload;
    try {
      payload = JSON.parse(text);
    } catch {
      throw new Error("Invalid import JSON.");
    }

    if (!payload || payload.schemaVersion !== SCHEMA_VERSION || !Array.isArray(payload.entries)) {
      throw new Error("Unsupported import schema.");
    }

    const entries = [];
    const seenUrls = new Set();

    for (const entry of payload.entries) {
      if (!entry || typeof entry !== "object" || !isReadableUrl(entry.url)) continue;
      if (seenUrls.has(entry.url)) continue;

      seenUrls.add(entry.url);
      const title = typeof entry.title === "string" && entry.title.trim()
        ? entry.title.trim()
        : entry.url;

      entries.push({
        url: entry.url,
        title,
        hasBeenRead: Boolean(entry.hasBeenRead),
        tags: normalizeTags(entry.tags)
      });
    }

    return { entries };
  }

  function buildImportPlan(importPayload, existingEntries, tagsByUrl) {
    const existingUrls = new Set(existingEntries.map((entry) => entry.url));
    const plannedUrls = new Set(existingUrls);
    const nextTagsByUrl = normalizeTagsByUrl(tagsByUrl);
    const entriesToAdd = [];

    for (const entry of importPayload.entries) {
      if (!plannedUrls.has(entry.url)) {
        plannedUrls.add(entry.url);
        entriesToAdd.push({
          url: entry.url,
          title: entry.title,
          hasBeenRead: entry.hasBeenRead
        });
      }

      const tags = normalizeTags([
        ...(nextTagsByUrl[entry.url] || []),
        ...entry.tags
      ]);

      if (tags.length > 0) {
        nextTagsByUrl[entry.url] = tags;
      }
    }

    return {
      entriesToAdd,
      tagsByUrl: nextTagsByUrl
    };
  }

  function isReadableUrl(value) {
    try {
      return ALLOWED_PROTOCOLS.has(new URL(value).protocol);
    } catch {
      return false;
    }
  }

  const api = {
    buildExportPayload,
    buildImportPlan,
    buildUrlListExport,
    getCurrentPageActions,
    normalizeImportPayload,
    normalizeTags,
    normalizeTagsByUrl
  };

  root.ReadingListData = api;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(globalThis);
